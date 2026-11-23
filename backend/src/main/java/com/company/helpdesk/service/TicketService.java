package com.company.helpdesk.service;

import com.company.helpdesk.dto.*;
import com.company.helpdesk.entity.*;
import com.company.helpdesk.exception.BusinessRuleException;
import com.company.helpdesk.exception.ResourceNotFoundException;
import com.company.helpdesk.repository.*;
import com.company.helpdesk.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static com.company.helpdesk.entity.TicketStatus.*;

/**
 * Ticket lifecycle and permissions.
 *
 * <ul>
 *   <li>USER: creates tickets, sees only their own, may edit while OPEN, cancel, confirm-close or reopen a resolved one.</li>
 *   <li>TECHNICIAN: sees every ticket, may claim unassigned ones, and works only on tickets assigned to them.</li>
 *   <li>ADMIN: may do everything, including assigning to any technician.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class TicketService {

    private static final Map<TicketStatus, Set<TicketStatus>> TRANSITIONS = Map.of(
            OPEN, EnumSet.of(IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CANCELLED),
            IN_PROGRESS, EnumSet.of(OPEN, WAITING_FOR_USER, RESOLVED, CANCELLED),
            WAITING_FOR_USER, EnumSet.of(IN_PROGRESS, RESOLVED, CANCELLED),
            RESOLVED, EnumSet.of(OPEN, IN_PROGRESS, CLOSED),
            CLOSED, EnumSet.noneOf(TicketStatus.class),
            CANCELLED, EnumSet.noneOf(TicketStatus.class));

    private final TicketRepository tickets;
    private final TicketHistoryRepository histories;
    private final CategoryRepository categories;
    private final UserRepository users;
    private final CurrentUser currentUser;
    private final TicketAccessService access;
    private final NotificationService notifications;

    // ------------------------------------------------------------------ queries

    @Transactional(readOnly = true)
    public PageResponse<TicketResponse> search(TicketFilter filter, Pageable pageable) {
        User me = currentUser.get();
        return page(access.isStaff(me) ? filter : filter.withRequester(me.getId()), pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<TicketResponse> searchMine(TicketFilter filter, Pageable pageable) {
        return page(filter.withRequester(currentUser.get().getId()), pageable);
    }

    @Transactional(readOnly = true)
    public PageResponse<TicketResponse> searchAssigned(TicketFilter filter, Pageable pageable) {
        return page(filter.withAssignee(currentUser.get().getId()), pageable);
    }

    @Transactional(readOnly = true)
    public TicketResponse get(Long id) {
        return TicketResponse.from(access.requireVisible(id));
    }

    @Transactional(readOnly = true)
    public List<TicketHistoryResponse> history(Long id) {
        Ticket t = access.requireVisible(id);
        return histories.findByTicketIdOrderByChangedAtAscIdAsc(t.getId()).stream()
                .map(TicketHistoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MyTicketSummary mySummary() {
        User me = currentUser.get();
        Map<TicketStatus, Long> counts = new EnumMap<>(TicketStatus.class);
        for (Object[] row : tickets.countByStatusForRequester(me.getId())) {
            counts.put((TicketStatus) row[0], ((Number) row[1]).longValue());
        }
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        return new MyTicketSummary(total, counts.getOrDefault(OPEN, 0L), counts.getOrDefault(IN_PROGRESS, 0L),
                counts.getOrDefault(WAITING_FOR_USER, 0L), counts.getOrDefault(RESOLVED, 0L),
                counts.getOrDefault(CLOSED, 0L), counts.getOrDefault(CANCELLED, 0L));
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public TicketResponse create(TicketCreateRequest request) {
        User me = currentUser.get();
        Ticket t = new Ticket();
        t.setTitle(request.title().trim());
        t.setDescription(request.description().trim());
        t.setPriority(request.priority() == null ? Priority.MEDIUM : request.priority());
        t.setStatus(OPEN);
        t.setRequester(me);
        t.setAssignee(null);
        if (request.categoryId() != null) {
            t.setCategory(findCategory(request.categoryId()));
        }
        tickets.save(t);
        record(t, me, "created", null, "Ticket created");
        return TicketResponse.from(t);
    }

    @Transactional
    public TicketResponse update(Long id, TicketUpdateRequest request) {
        User me = currentUser.get();
        Ticket t = access.requireVisible(id);
        requireNotFinal(t);
        if (access.isStaff(me)) {
            claimOrVerify(me, t);
        } else if (t.getStatus() != OPEN) {
            throw new AccessDeniedException("You can only edit a ticket while it is still open");
        }
        Category newCategory = request.categoryId() == null ? null : findCategory(request.categoryId());
        record(t, me, "title", t.getTitle(), request.title().trim());
        record(t, me, "description", t.getDescription(), request.description().trim());
        record(t, me, "category", categoryName(t.getCategory()), categoryName(newCategory));
        t.setTitle(request.title().trim());
        t.setDescription(request.description().trim());
        t.setCategory(newCategory);
        return TicketResponse.from(t);
    }

    @Transactional
    public TicketResponse changeStatus(Long id, StatusChangeRequest request) {
        User me = currentUser.get();
        Ticket t = access.requireVisible(id);
        TicketStatus from = t.getStatus();
        TicketStatus to = request.status();

        requireNotFinal(t);
        if (from == to) {
            throw new BusinessRuleException("The ticket is already " + label(to));
        }
        if (to == RESOLVED) {
            throw new BusinessRuleException("Use the resolve action so resolution notes are recorded");
        }
        if (!TRANSITIONS.get(from).contains(to)) {
            throw new BusinessRuleException("A ticket cannot move from %s to %s".formatted(label(from), label(to)));
        }

        boolean staff = access.isStaff(me);
        if (staff) {
            claimOrVerify(me, t);
        } else {
            boolean allowed = to == CANCELLED || (from == RESOLVED && (to == CLOSED || to == OPEN));
            if (!allowed) {
                throw new AccessDeniedException("Only technicians and admins can make this change");
            }
        }

        if (from == RESOLVED && to != CLOSED) {
            t.setResolvedAt(null);   // reopened: the resolution clock restarts
        }
        t.setStatus(to);
        record(t, me, "status", from.name(), to.name());

        String headline = "Status changed from %s to %s by %s".formatted(label(from), label(to), me.getFullName());
        if (staff) {
            notifications.notifyAbout(t.getRequester(), me, t, headline);
        } else {
            notifications.notifyAbout(t.getAssignee(), me, t, headline);
        }
        return TicketResponse.from(t);
    }

    @Transactional
    public TicketResponse assign(Long id, AssignRequest request) {
        User me = currentUser.get();
        if (!access.isStaff(me)) {
            throw new AccessDeniedException("Only technicians and admins can assign tickets");
        }
        Ticket t = access.requireVisible(id);
        requireNotFinal(t);

        User target = null;
        if (request.assigneeId() != null) {
            target = users.findById(request.assigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("User %d was not found".formatted(request.assigneeId())));
            if (!target.isActive() || target.getRole() != Role.TECHNICIAN) {
                throw new BusinessRuleException("Tickets can only be assigned to active technicians");
            }
        }
        if (me.getRole() == Role.TECHNICIAN) {
            boolean claiming = target != null && target.getId().equals(me.getId()) && t.getAssignee() == null;
            if (!claiming) {
                throw new AccessDeniedException("Technicians can only assign unassigned tickets to themselves");
            }
        }
        if (Objects.equals(idOf(t.getAssignee()), idOf(target))) {
            throw new BusinessRuleException(target == null
                    ? "The ticket is already unassigned" : "The ticket is already assigned to that technician");
        }

        record(t, me, "assignee", nameOf(t.getAssignee()), nameOf(target));
        t.setAssignee(target);
        if (target != null) {
            notifications.notifyAbout(target, me, t, "Ticket assigned to you by " + me.getFullName());
        }
        return TicketResponse.from(t);
    }

    @Transactional
    public TicketResponse changePriority(Long id, PriorityChangeRequest request) {
        User me = currentUser.get();
        if (!access.isStaff(me)) {
            throw new AccessDeniedException("Only technicians and admins can change priority");
        }
        Ticket t = access.requireVisible(id);
        requireNotFinal(t);
        if (t.getPriority() == request.priority()) {
            throw new BusinessRuleException("The ticket already has " + label(request.priority()) + " priority");
        }
        claimOrVerify(me, t);
        record(t, me, "priority", t.getPriority().name(), request.priority().name());
        t.setPriority(request.priority());
        return TicketResponse.from(t);
    }

    @Transactional
    public TicketResponse resolve(Long id, ResolveRequest request) {
        User me = currentUser.get();
        if (!access.isStaff(me)) {
            throw new AccessDeniedException("Only technicians and admins can resolve tickets");
        }
        Ticket t = access.requireVisible(id);
        requireNotFinal(t);
        if (t.getStatus() == RESOLVED) {
            throw new BusinessRuleException("The ticket is already resolved");
        }
        claimOrVerify(me, t);

        String notes = request.resolutionNotes().trim();
        record(t, me, "status", t.getStatus().name(), RESOLVED.name());
        record(t, me, "resolutionNotes", t.getResolutionNotes(), notes);
        t.setStatus(RESOLVED);
        t.setResolvedAt(LocalDateTime.now());
        t.setResolutionNotes(notes);

        notifications.notifyAbout(t.getRequester(), me, t,
                "Your ticket was resolved by %s. Please confirm it is fixed or reopen it.".formatted(me.getFullName()));
        return TicketResponse.from(t);
    }

    @Transactional
    public TicketResponse close(Long id) {
        User me = currentUser.get();
        Ticket t = access.requireVisible(id);
        if (t.getStatus() != RESOLVED) {
            throw new BusinessRuleException("Only resolved tickets can be closed");
        }
        if (access.isStaff(me)) {
            claimOrVerify(me, t);
        }
        record(t, me, "status", t.getStatus().name(), CLOSED.name());
        t.setStatus(CLOSED);
        if (!access.isStaff(me)) {
            notifications.notifyAbout(t.getAssignee(), me, t, "%s confirmed the fix and closed the ticket".formatted(me.getFullName()));
        }
        return TicketResponse.from(t);
    }

    // ------------------------------------------------------------------ helpers

    private PageResponse<TicketResponse> page(TicketFilter filter, Pageable pageable) {
        return PageResponse.from(tickets.findAll(TicketSpecs.from(filter), pageable).map(TicketResponse::from));
    }

    private static void requireNotFinal(Ticket t) {
        if (t.getStatus().isFinal()) {
            throw new BusinessRuleException("The ticket is %s and can no longer be changed".formatted(label(t.getStatus())));
        }
    }

    /**
     * Technicians may only work on tickets assigned to them. Touching an unassigned ticket claims it, so a
     * technician who starts work never has to assign it separately. Admins are unrestricted.
     */
    private void claimOrVerify(User me, Ticket t) {
        if (me.getRole() == Role.ADMIN) {
            return;
        }
        if (t.getAssignee() == null) {
            record(t, me, "assignee", null, me.getFullName());
            t.setAssignee(me);
            return;
        }
        if (!t.getAssignee().getId().equals(me.getId())) {
            throw new AccessDeniedException("This ticket is assigned to " + t.getAssignee().getFullName());
        }
    }

    private Category findCategory(Long id) {
        return categories.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category %d was not found".formatted(id)));
    }

    private void record(Ticket t, User by, String field, String oldValue, String newValue) {
        if (Objects.equals(oldValue, newValue)) {
            return;
        }
        TicketHistory h = new TicketHistory();
        h.setTicket(t);
        h.setChangedBy(by);
        h.setFieldName(field);
        h.setOldValue(oldValue);
        h.setNewValue(newValue);
        histories.save(h);
    }

    private static Long idOf(User u) {
        return u == null ? null : u.getId();
    }

    private static String nameOf(User u) {
        return u == null ? null : u.getFullName();
    }

    private static String categoryName(Category c) {
        return c == null ? null : c.getName();
    }

    private static String label(Enum<?> e) {
        return e.name().replace('_', ' ').toLowerCase();
    }
}
