package com.company.helpdesk.dto;

public record SummaryReport(
        long totalTickets,
        long open,
        long inProgress,
        long waitingForUser,
        long resolved,
        long closed,
        long cancelled,
        long unassignedActive,
        long criticalActive,
        long slaBreachedActive,
        long createdLast7Days,
        long resolvedLast7Days,
        long myAssignedActive,
        Double averageResolutionHours) {
}
