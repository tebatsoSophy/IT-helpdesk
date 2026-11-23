package com.company.helpdesk.controller;

import com.company.helpdesk.dto.*;
import com.company.helpdesk.entity.Priority;
import com.company.helpdesk.entity.TicketStatus;
import com.company.helpdesk.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    /** All tickets visible to the caller (regular users only ever see their own). */
    @GetMapping
    public PageResponse<TicketResponse> list(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long requesterId,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ticketService.search(
                new TicketFilter(status, priority, categoryId, assigneeId, requesterId, unassigned, from, to, q),
                pageable);
    }

    @GetMapping("/my")
    public PageResponse<TicketResponse> mine(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ticketService.searchMine(
                new TicketFilter(status, priority, categoryId, null, null, null, from, to, q), pageable);
    }

    @GetMapping("/my/summary")
    public MyTicketSummary mySummary() {
        return ticketService.mySummary();
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public PageResponse<TicketResponse> assigned(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ticketService.searchAssigned(
                new TicketFilter(status, priority, categoryId, null, null, null, from, to, q), pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse create(@Valid @RequestBody TicketCreateRequest request) {
        return ticketService.create(request);
    }

    @GetMapping("/{id}")
    public TicketResponse get(@PathVariable Long id) {
        return ticketService.get(id);
    }

    @GetMapping("/{id}/history")
    public List<TicketHistoryResponse> history(@PathVariable Long id) {
        return ticketService.history(id);
    }

    @PutMapping("/{id}")
    public TicketResponse update(@PathVariable Long id, @Valid @RequestBody TicketUpdateRequest request) {
        return ticketService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public TicketResponse changeStatus(@PathVariable Long id, @Valid @RequestBody StatusChangeRequest request) {
        return ticketService.changeStatus(id, request);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public TicketResponse assign(@PathVariable Long id, @RequestBody AssignRequest request) {
        return ticketService.assign(id, request);
    }

    @PatchMapping("/{id}/priority")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public TicketResponse changePriority(@PathVariable Long id, @Valid @RequestBody PriorityChangeRequest request) {
        return ticketService.changePriority(id, request);
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public TicketResponse resolve(@PathVariable Long id, @Valid @RequestBody ResolveRequest request) {
        return ticketService.resolve(id, request);
    }

    @PostMapping("/{id}/close")
    public TicketResponse close(@PathVariable Long id) {
        return ticketService.close(id);
    }
}
