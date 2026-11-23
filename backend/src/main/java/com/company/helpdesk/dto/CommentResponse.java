package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Comment;

import java.time.LocalDateTime;

public record CommentResponse(Long id, Long ticketId, UserSummary author, String content, boolean internal,
                              LocalDateTime createdAt) {

    public static CommentResponse from(Comment c) {
        return new CommentResponse(c.getId(), c.getTicket().getId(), UserSummary.from(c.getAuthor()),
                c.getContent(), c.isInternal(), c.getCreatedAt());
    }
}
