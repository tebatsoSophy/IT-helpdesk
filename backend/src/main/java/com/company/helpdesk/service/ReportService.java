package com.company.helpdesk.service;

import com.company.helpdesk.dto.*;
import com.company.helpdesk.entity.Priority;
import com.company.helpdesk.entity.Role;
import com.company.helpdesk.entity.TicketStatus;
import com.company.helpdesk.entity.User;
import com.company.helpdesk.repository.TicketRepository;
import com.company.helpdesk.repository.UserRepository;
import com.company.helpdesk.security.CurrentUser;
import com.company.helpdesk.util.SlaPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Reporting. Averages are computed in Java from the resolved rows rather than with database date functions,
 * which keeps the queries identical on H2 and PostgreSQL. Fine for thousands of tickets; move to SQL aggregates
 * if the volume grows to hundreds of thousands.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private static final List<TicketStatus> ACTIVE =
            List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER);

    private final TicketRepository tickets;
    private final UserRepository users;
    private final CurrentUser currentUser;

    public SummaryReport summary() {
        User me = currentUser.get();
        LocalDateTime now = LocalDateTime.now();
        Map<TicketStatus, Long> byStatus = new EnumMap<>(TicketStatus.class);
        for (Object[] row : tickets.countByStatus()) {
            byStatus.put((TicketStatus) row[0], ((Number) row[1]).longValue());
        }
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();

        long breached = 0;
        for (Priority p : Priority.values()) {
            breached += tickets.countByPriorityAndStatusInAndCreatedAtBefore(
                    p, ACTIVE, now.minusHours(SlaPolicy.targetHours(p)));
        }

        List<Object[]> resolved = tickets.findResolvedRows();
        Double avg = averageHours(resolved.stream().map(r -> minutes(r[2], r[3])).toList());

        return new SummaryReport(
                total,
                byStatus.getOrDefault(TicketStatus.OPEN, 0L),
                byStatus.getOrDefault(TicketStatus.IN_PROGRESS, 0L),
                byStatus.getOrDefault(TicketStatus.WAITING_FOR_USER, 0L),
                byStatus.getOrDefault(TicketStatus.RESOLVED, 0L),
                byStatus.getOrDefault(TicketStatus.CLOSED, 0L),
                byStatus.getOrDefault(TicketStatus.CANCELLED, 0L),
                tickets.countByAssigneeIsNullAndStatusIn(ACTIVE),
                tickets.countByPriorityAndStatusIn(Priority.CRITICAL, ACTIVE),
                breached,
                tickets.countByCreatedAtAfter(now.minusDays(7)),
                tickets.countByResolvedAtAfter(now.minusDays(7)),
                tickets.countByAssigneeIdAndStatusIn(me.getId(), ACTIVE),
                avg);
    }

    public List<CountItem> byStatus() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : tickets.countByStatus()) {
            counts.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return Arrays.stream(TicketStatus.values())
                .map(s -> new CountItem(s.name(), counts.getOrDefault(s.name(), 0L))).toList();
    }

    public List<CountItem> byPriority() {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : tickets.countByPriority()) {
            counts.put(row[0].toString(), ((Number) row[1]).longValue());
        }
        return Arrays.stream(Priority.values())
                .map(p -> new CountItem(p.name(), counts.getOrDefault(p.name(), 0L))).toList();
    }

    public List<CountItem> byCategory() {
        return tickets.countByCategory().stream()
                .map(row -> new CountItem(row[0] == null ? "Uncategorized" : row[0].toString(),
                        ((Number) row[1]).longValue()))
                .toList();
    }

    /** Titles that keep coming back (case-insensitive), most frequent first. */
    public List<CommonIncident> commonIncidents() {
        return tickets.findCommonTitles(PageRequest.of(0, 10)).stream()
                .map(row -> new CommonIncident(row[0].toString(), ((Number) row[1]).longValue()))
                .toList();
    }

    public ResolutionTimesReport resolutionTimes() {
        List<Object[]> rows = tickets.findResolvedRows();
        Double overall = averageHours(rows.stream().map(r -> minutes(r[2], r[3])).toList());

        Map<String, List<Long>> byPriority = new LinkedHashMap<>();
        for (Priority p : Priority.values()) {
            byPriority.put(p.name(), new ArrayList<>());
        }
        Map<String, List<Long>> byCategory = new TreeMap<>();
        for (Object[] r : rows) {
            long mins = minutes(r[2], r[3]);
            byPriority.get(r[0].toString()).add(mins);
            byCategory.computeIfAbsent(r[1] == null ? "Uncategorized" : r[1].toString(), k -> new ArrayList<>()).add(mins);
        }
        return new ResolutionTimesReport(rows.size(), overall, toItems(byPriority), toItems(byCategory));
    }

    public List<TechnicianPerformance> technicianPerformance() {
        class Acc {
            String name;
            long assigned, active, resolved;
            final List<Long> minutes = new ArrayList<>();
        }
        Map<Long, Acc> accs = new LinkedHashMap<>();
        for (User tech : users.findByRoleOrderByFullNameAsc(Role.TECHNICIAN)) {
            Acc a = new Acc();
            a.name = tech.getFullName();
            accs.put(tech.getId(), a);
        }
        for (Object[] r : tickets.findAssignedRows()) {
            Long id = ((Number) r[0]).longValue();
            Acc a = accs.computeIfAbsent(id, k -> {
                Acc n = new Acc();
                n.name = r[1].toString();
                return n;
            });
            TicketStatus status = (TicketStatus) r[2];
            a.assigned++;
            if (status.isActive()) {
                a.active++;
            }
            if (status == TicketStatus.RESOLVED || status == TicketStatus.CLOSED) {
                a.resolved++;
            }
            if (r[4] != null) {
                a.minutes.add(minutes(r[3], r[4]));
            }
        }
        return accs.entrySet().stream()
                .map(e -> new TechnicianPerformance(e.getKey(), e.getValue().name, e.getValue().assigned,
                        e.getValue().active, e.getValue().resolved, averageHours(e.getValue().minutes)))
                .sorted(Comparator.comparingLong(TechnicianPerformance::resolved).reversed())
                .toList();
    }

    // ------------------------------------------------------------------ helpers

    private static long minutes(Object created, Object resolved) {
        return Duration.between((LocalDateTime) created, (LocalDateTime) resolved).toMinutes();
    }

    private static Double averageHours(List<Long> minutes) {
        if (minutes.isEmpty()) {
            return null;
        }
        double avg = minutes.stream().mapToLong(Long::longValue).average().orElse(0) / 60.0;
        return Math.round(avg * 10.0) / 10.0;
    }

    private static List<ResolutionTimeItem> toItems(Map<String, List<Long>> grouped) {
        return grouped.entrySet().stream()
                .map(e -> new ResolutionTimeItem(e.getKey(), e.getValue().size(),
                        Optional.ofNullable(averageHours(e.getValue())).orElse(0.0)))
                .collect(Collectors.toList());
    }
}
