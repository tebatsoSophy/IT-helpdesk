package com.company.helpdesk.service;

import com.company.helpdesk.entity.Role;
import com.company.helpdesk.entity.Ticket;
import com.company.helpdesk.entity.User;
import com.company.helpdesk.exception.ResourceNotFoundException;
import com.company.helpdesk.repository.TicketRepository;
import com.company.helpdesk.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Single place that decides who may see which ticket. */
@Service
@RequiredArgsConstructor
public class TicketAccessService {

    private final TicketRepository tickets;
    private final CurrentUser currentUser;

    public boolean isStaff(User user) {
        return user.getRole() == Role.TECHNICIAN || user.getRole() == Role.ADMIN;
    }

    /**
     * Loads a ticket the current user is allowed to see. Regular users only see their own tickets, and get a 404
     * (not a 403) for anyone else's so ticket ids cannot be probed.
     */
    public Ticket requireVisible(Long id) {
        User me = currentUser.get();
        Ticket ticket = tickets.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket %d was not found".formatted(id)));
        if (!isStaff(me) && !ticket.getRequester().getId().equals(me.getId())) {
            throw new ResourceNotFoundException("Ticket %d was not found".formatted(id));
        }
        return ticket;
    }
}
