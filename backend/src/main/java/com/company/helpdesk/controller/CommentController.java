package com.company.helpdesk.controller;

import com.company.helpdesk.dto.CommentRequest;
import com.company.helpdesk.dto.CommentResponse;
import com.company.helpdesk.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets/{ticketId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public List<CommentResponse> list(@PathVariable Long ticketId) {
        return commentService.list(ticketId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse add(@PathVariable Long ticketId, @Valid @RequestBody CommentRequest request) {
        return commentService.add(ticketId, request);
    }
}
