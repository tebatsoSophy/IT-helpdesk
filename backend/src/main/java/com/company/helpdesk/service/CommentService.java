package com.company.helpdesk.service;

import com.company.helpdesk.dto.CommentRequest;
import com.company.helpdesk.dto.CommentResponse;
import com.company.helpdesk.entity.Comment;
import com.company.helpdesk.entity.Ticket;
import com.company.helpdesk.entity.User;
import com.company.helpdesk.exception.BusinessRuleException;
import com.company.helpdesk.repository.CommentRepository;
import com.company.helpdesk.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository comments;
    private final TicketAccessService access;
    private final CurrentUser currentUser;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long ticketId) {
        User me = currentUser.get();
        Ticket t = access.requireVisible(ticketId);
        List<Comment> found = access.isStaff(me)
                ? comments.findByTicketIdOrderByCreatedAtAscIdAsc(t.getId())
                : comments.findByTicketIdAndInternalFalseOrderByCreatedAtAscIdAsc(t.getId());
        return found.stream().map(CommentResponse::from).toList();
    }

    @Transactional
    public CommentResponse add(Long ticketId, CommentRequest request) {
        User me = currentUser.get();
        Ticket t = access.requireVisible(ticketId);
        if (t.getStatus().isFinal()) {
            throw new BusinessRuleException("Comments are closed on %s tickets"
                    .formatted(t.getStatus().name().toLowerCase()));
        }
        boolean staff = access.isStaff(me);
        if (request.internal() && !staff) {
            throw new AccessDeniedException("Only technicians and admins can add internal notes");
        }

        Comment c = new Comment();
        c.setTicket(t);
        c.setAuthor(me);
        c.setContent(request.content().trim());
        c.setInternal(request.internal());
        comments.save(c);
        t.setUpdatedAt(LocalDateTime.now());   // surfaces recent activity in lists

        if (!c.isInternal()) {
            String headline = "%s commented on your ticket".formatted(me.getFullName());
            if (staff) {
                notifications.notifyAbout(t.getRequester(), me, t, headline);
            } else {
                notifications.notifyAbout(t.getAssignee(), me, t, "%s replied on the ticket".formatted(me.getFullName()));
            }
        }
        return CommentResponse.from(c);
    }
}
