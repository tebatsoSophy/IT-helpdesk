package com.company.helpdesk.dto;

import java.util.List;

public record ResolutionTimesReport(long resolvedCount, Double averageHours,
                                    List<ResolutionTimeItem> byPriority, List<ResolutionTimeItem> byCategory) {
}
