package com.company.helpdesk.controller;

import com.company.helpdesk.dto.*;
import com.company.helpdesk.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public SummaryReport summary() {
        return reportService.summary();
    }

    @GetMapping("/common-incidents")
    public List<CommonIncident> commonIncidents() {
        return reportService.commonIncidents();
    }

    @GetMapping("/technician-performance")
    @PreAuthorize("hasRole('ADMIN')")
    public List<TechnicianPerformance> technicianPerformance() {
        return reportService.technicianPerformance();
    }

    @GetMapping("/resolution-times")
    public ResolutionTimesReport resolutionTimes() {
        return reportService.resolutionTimes();
    }

    @GetMapping("/tickets-by-status")
    public List<CountItem> byStatus() {
        return reportService.byStatus();
    }

    @GetMapping("/tickets-by-priority")
    public List<CountItem> byPriority() {
        return reportService.byPriority();
    }

    @GetMapping("/tickets-by-category")
    public List<CountItem> byCategory() {
        return reportService.byCategory();
    }
}
