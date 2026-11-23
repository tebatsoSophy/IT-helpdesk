package com.company.helpdesk.controller;

import com.company.helpdesk.dto.AttachmentResponse;
import com.company.helpdesk.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @GetMapping("/tickets/{ticketId}/attachments")
    public List<AttachmentResponse> list(@PathVariable Long ticketId) {
        return attachmentService.list(ticketId);
    }

    @PostMapping(value = "/tickets/{ticketId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse upload(@PathVariable Long ticketId, @RequestParam("file") MultipartFile file) {
        return attachmentService.upload(ticketId, file);
    }

    @GetMapping("/attachments/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        AttachmentService.Download d = attachmentService.load(id);
        MediaType type;
        try {
            type = d.contentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(d.contentType());
        } catch (Exception e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.fileName(), StandardCharsets.UTF_8).build().toString())
                .body(d.resource());
    }
}
