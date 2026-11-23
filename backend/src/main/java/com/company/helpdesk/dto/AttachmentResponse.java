package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Attachment;

import java.time.LocalDateTime;

public record AttachmentResponse(Long id, Long ticketId, String fileName, String contentType, long size,
                                 UserSummary uploadedBy, LocalDateTime uploadedAt) {

    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.getId(), a.getTicket().getId(), a.getFileName(), a.getContentType(),
                a.getFileSize(), UserSummary.from(a.getUploadedBy()), a.getUploadedAt());
    }
}
