package com.company.helpdesk.repository;

import com.company.helpdesk.dto.TicketFilter;
import com.company.helpdesk.entity.Ticket;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Builds the dynamic WHERE clause for ticket searches. */
public final class TicketSpecs {

    private TicketSpecs() {
    }

    public static Specification<Ticket> from(TicketFilter f) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (f.status() != null) {
                p.add(cb.equal(root.get("status"), f.status()));
            }
            if (f.priority() != null) {
                p.add(cb.equal(root.get("priority"), f.priority()));
            }
            if (f.categoryId() != null) {
                p.add(cb.equal(root.get("category").get("id"), f.categoryId()));
            }
            if (f.requesterId() != null) {
                p.add(cb.equal(root.get("requester").get("id"), f.requesterId()));
            }
            if (f.assigneeId() != null) {
                p.add(cb.equal(root.get("assignee").get("id"), f.assigneeId()));
            }
            if (Boolean.TRUE.equals(f.unassigned())) {
                p.add(cb.isNull(root.get("assignee")));
            }
            if (f.from() != null) {
                p.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("createdAt"), f.from().atStartOfDay()));
            }
            if (f.to() != null) {
                p.add(cb.lessThan(root.<LocalDateTime>get("createdAt"), f.to().plusDays(1).atStartOfDay()));
            }
            if (StringUtils.hasText(f.q())) {
                String like = "%" + f.q().trim().toLowerCase() + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.<String>get("title")), like),
                        cb.like(cb.lower(root.<String>get("description")), like)));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
