package com.company.helpdesk.dto;

public record TechnicianPerformance(Long technicianId, String name, long assigned, long active, long resolved,
                                    Double averageResolutionHours) {
}
