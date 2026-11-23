package com.company.helpdesk.dto;

/** A null {@code assigneeId} unassigns the ticket (admin only). */
public record AssignRequest(Long assigneeId) {
}
