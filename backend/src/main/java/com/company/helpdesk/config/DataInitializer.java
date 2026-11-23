package com.company.helpdesk.config;

import com.company.helpdesk.entity.*;
import com.company.helpdesk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Seeds the first admin and the default categories. When {@code app.seed.demo-data} is true it also creates
 * demo technicians, a demo user and a set of back-dated sample tickets so the dashboards have something to show.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Password123!";

    private final UserRepository users;
    private final CategoryRepository categories;
    private final TicketRepository tickets;
    private final CommentRepository comments;
    private final TicketHistoryRepository histories;
    private final PasswordEncoder encoder;

    @Value("${app.seed.admin-email}")
    private String adminEmail;
    @Value("${app.seed.admin-password}")
    private String adminPassword;
    @Value("${app.seed.demo-data}")
    private boolean demoData;

    @Override
    @Transactional
    public void run(String... args) {
        seedCategories();
        seedAdmin();
        if (demoData) {
            seedDemoUsers();
            if (tickets.count() == 0) {
                seedDemoTickets();
            }
        }
    }

    private void seedCategories() {
        if (categories.count() > 0) {
            return;
        }
        Map<String, String> defaults = new LinkedHashMap<>();
        defaults.put("Hardware", "Laptops, desktops, monitors, peripherals");
        defaults.put("Software", "Application installs, crashes, licences");
        defaults.put("Network", "Wi-Fi, VPN, connectivity and speed");
        defaults.put("Access & Accounts", "Passwords, permissions, new starters, leavers");
        defaults.put("Email & Collaboration", "Mailboxes, calendars, chat and meetings");
        defaults.put("Printing", "Printers, scanners, print queues");
        defaults.put("Other", "Anything that does not fit elsewhere");
        defaults.forEach((name, description) -> {
            Category c = new Category();
            c.setName(name);
            c.setDescription(description);
            categories.save(c);
        });
        log.info("Seeded {} default categories", defaults.size());
    }

    private void seedAdmin() {
        if (users.existsByRole(Role.ADMIN)) {
            return;
        }
        createUser(adminEmail, adminPassword, "System Administrator", Role.ADMIN);
        log.warn("Created initial admin account {} - change its password after first login", adminEmail);
    }

    private void seedDemoUsers() {
        createIfMissing("tech1@helpdesk.local", "Thabo Mokoena", Role.TECHNICIAN);
        createIfMissing("tech2@helpdesk.local", "Lerato Dlamini", Role.TECHNICIAN);
        createIfMissing("user@helpdesk.local", "Naledi Khumalo", Role.USER);
        createIfMissing("user2@helpdesk.local", "Pieter van Wyk", Role.USER);
        log.warn("Demo data enabled: tech1/tech2/user/user2@helpdesk.local use password '{}'. Disable in production.",
                DEMO_PASSWORD);
    }

    private void createIfMissing(String email, String name, Role role) {
        if (!users.existsByEmailIgnoreCase(email)) {
            createUser(email, DEMO_PASSWORD, name, role);
        }
    }

    private User createUser(String email, String rawPassword, String name, Role role) {
        User u = new User();
        u.setEmail(email.trim().toLowerCase());
        u.setPassword(encoder.encode(rawPassword));
        u.setFullName(name);
        u.setRole(role);
        u.setActive(true);
        return users.save(u);
    }

    private void seedDemoTickets() {
        Map<String, Category> cat = categories.findAll().stream()
                .collect(Collectors.toMap(Category::getName, Function.identity()));
        User t1 = users.findByEmailIgnoreCase("tech1@helpdesk.local").orElseThrow();
        User t2 = users.findByEmailIgnoreCase("tech2@helpdesk.local").orElseThrow();
        User u1 = users.findByEmailIgnoreCase("user@helpdesk.local").orElseThrow();
        User u2 = users.findByEmailIgnoreCase("user2@helpdesk.local").orElseThrow();
        LocalDateTime now = LocalDateTime.now();

        // title, description, category, priority, status, requester, assignee, hours ago created, hours to resolve
        seed("VPN drops every 10 minutes", "The VPN disconnects while I work from home and I have to log in again.",
                cat.get("Network"), Priority.HIGH, TicketStatus.IN_PROGRESS, u1, t1, now.minusHours(5), null, null);
        seed("Cannot print to 3rd floor printer", "Jobs stay in the queue and never print.",
                cat.get("Printing"), Priority.LOW, TicketStatus.OPEN, u2, null, now.minusHours(30), null, null);
        seed("Laptop will not boot after update", "Black screen after the Windows update last night.",
                cat.get("Hardware"), Priority.CRITICAL, TicketStatus.OPEN, u1, null, now.minusHours(6), null, null);
        seed("Need Adobe Acrobat installed", "Required for signing contracts.",
                cat.get("Software"), Priority.MEDIUM, TicketStatus.WAITING_FOR_USER, u2, t2, now.minusDays(2), null, null);
        seed("Password reset for finance portal", "Locked out after too many attempts.",
                cat.get("Access & Accounts"), Priority.HIGH, TicketStatus.RESOLVED, u1, t1, now.minusDays(3),
                now.minusDays(3).plusHours(2), "Reset the password and unlocked the account. Asked user to enrol in self-service reset.");
        seed("Outlook keeps asking for credentials", "Prompt appears every few minutes.",
                cat.get("Email & Collaboration"), Priority.MEDIUM, TicketStatus.CLOSED, u2, t2, now.minusDays(6),
                now.minusDays(5).minusHours(14), "Recreated the Outlook profile; cached credentials were corrupt.");
        seed("Wi-Fi unavailable in meeting room B", "Guests cannot connect.",
                cat.get("Network"), Priority.MEDIUM, TicketStatus.CLOSED, u1, t1, now.minusDays(8),
                now.minusDays(8).plusHours(9), "Access point had lost power over PoE. Replaced the patch cable.");
        seed("VPN drops every 10 minutes", "Same issue as last week, happening again.",
                cat.get("Network"), Priority.MEDIUM, TicketStatus.RESOLVED, u2, t1, now.minusDays(10),
                now.minusDays(10).plusHours(5), "Updated VPN client to the latest version.");
        seed("Monitor flickers", "External monitor flickers when the laptop is docked.",
                cat.get("Hardware"), Priority.LOW, TicketStatus.CLOSED, u2, t2, now.minusDays(12),
                now.minusDays(11), "Replaced the DisplayPort cable.");
        seed("Request access to shared drive", "New starter in marketing needs the brand assets folder.",
                cat.get("Access & Accounts"), Priority.LOW, TicketStatus.CLOSED, u1, t2, now.minusDays(14),
                now.minusDays(13).minusHours(20), "Added to the Marketing-Assets group.");
        seed("Teams meetings have no audio", "Nobody can hear me on calls.",
                cat.get("Email & Collaboration"), Priority.HIGH, TicketStatus.CANCELLED, u2, null, now.minusDays(4), null, null);
        seed("Printer out of toner", "Second floor printer shows low toner.",
                cat.get("Printing"), Priority.LOW, TicketStatus.RESOLVED, u1, t2, now.minusDays(1),
                now.minusDays(1).plusHours(3), "Replaced toner cartridge.");

        // A couple of comments on the first ticket so the thread view has content.
        Ticket first = tickets.findAll().stream().filter(t -> t.getTitle().startsWith("VPN drops") && t.getStatus() == TicketStatus.IN_PROGRESS)
                .findFirst().orElseThrow();
        comment(first, t1, "Thanks for reporting this. Which VPN client version are you on?", false, now.minusHours(4));
        comment(first, u1, "Version 5.2.1 on Windows 11.", false, now.minusHours(3));
        comment(first, t1, "Looks related to the known keep-alive bug. Checking whether the gateway needs a patch.", true, now.minusHours(2));
        log.info("Seeded {} demo tickets", tickets.count());
    }

    private void seed(String title, String description, Category category, Priority priority, TicketStatus status,
                      User requester, User assignee, LocalDateTime createdAt, LocalDateTime resolvedAt, String notes) {
        Ticket t = new Ticket();
        t.setTitle(title);
        t.setDescription(description);
        t.setCategory(category);
        t.setPriority(priority);
        t.setStatus(status);
        t.setRequester(requester);
        t.setAssignee(assignee);
        t.setCreatedAt(createdAt);
        t.setUpdatedAt(resolvedAt != null ? resolvedAt : createdAt);
        t.setResolvedAt(resolvedAt);
        t.setResolutionNotes(notes);
        tickets.save(t);

        history(t, requester, "created", null, "Ticket created", createdAt);
        if (assignee != null) {
            history(t, assignee, "assignee", null, assignee.getFullName(), createdAt.plusMinutes(20));
        }
        if (resolvedAt != null) {
            history(t, assignee != null ? assignee : requester, "status", TicketStatus.IN_PROGRESS.name(),
                    TicketStatus.RESOLVED.name(), resolvedAt);
        }
    }

    private void history(Ticket t, User by, String field, String oldValue, String newValue, LocalDateTime at) {
        TicketHistory h = new TicketHistory();
        h.setTicket(t);
        h.setChangedBy(by);
        h.setFieldName(field);
        h.setOldValue(oldValue);
        h.setNewValue(newValue);
        h.setChangedAt(at);
        histories.save(h);
    }

    private void comment(Ticket t, User author, String content, boolean internal, LocalDateTime at) {
        Comment c = new Comment();
        c.setTicket(t);
        c.setAuthor(author);
        c.setContent(content);
        c.setInternal(internal);
        c.setCreatedAt(at);
        comments.save(c);
    }
}
