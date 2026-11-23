package com.company.helpdesk.service;

import com.company.helpdesk.dto.AttachmentResponse;
import com.company.helpdesk.entity.Attachment;
import com.company.helpdesk.entity.Ticket;
import com.company.helpdesk.entity.User;
import com.company.helpdesk.exception.BusinessRuleException;
import com.company.helpdesk.exception.ResourceNotFoundException;
import com.company.helpdesk.repository.AttachmentRepository;
import com.company.helpdesk.security.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Stores attachments on local disk (mount a volume in production, or swap this class for S3). */
@Service
public class AttachmentService {

    private final AttachmentRepository attachments;
    private final TicketAccessService access;
    private final CurrentUser currentUser;
    private final Path root;

    public AttachmentService(AttachmentRepository attachments, TicketAccessService access, CurrentUser currentUser,
                             @Value("${app.upload-dir}") String uploadDir) {
        this.attachments = attachments;
        this.access = access;
        this.currentUser = currentUser;
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create upload directory " + root, e);
        }
    }

    public record Download(String fileName, String contentType, Resource resource) {
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(Long ticketId) {
        Ticket t = access.requireVisible(ticketId);
        return attachments.findByTicketIdOrderByUploadedAtAscIdAsc(t.getId()).stream()
                .map(AttachmentResponse::from).toList();
    }

    @Transactional
    public AttachmentResponse upload(Long ticketId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException("The file is empty");
        }
        User me = currentUser.get();
        Ticket t = access.requireVisible(ticketId);
        if (t.getStatus().isFinal()) {
            throw new BusinessRuleException("Files cannot be added to a %s ticket".formatted(t.getStatus().name().toLowerCase()));
        }

        String stored = UUID.randomUUID().toString();
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(stored));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store the uploaded file", e);
        }

        Attachment a = new Attachment();
        a.setTicket(t);
        a.setFileName(sanitise(file.getOriginalFilename()));
        a.setFilePath(stored);
        a.setContentType(file.getContentType());
        a.setFileSize(file.getSize());
        a.setUploadedBy(me);
        attachments.save(a);
        return AttachmentResponse.from(a);
    }

    @Transactional(readOnly = true)
    public Download load(Long attachmentId) {
        Attachment a = attachments.findWithTicketById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment %d was not found".formatted(attachmentId)));
        access.requireVisible(a.getTicket().getId());   // same visibility rules as the ticket
        Path path = root.resolve(a.getFilePath()).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("The file is missing from storage");
        }
        return new Download(a.getFileName(), a.getContentType(), new FileSystemResource(path));
    }

    private static String sanitise(String original) {
        String name = Objects.requireNonNullElse(original, "file").replaceAll("[\\\\/\\p{Cntrl}]", "_").trim();
        if (name.isBlank() || name.equals(".") || name.equals("..")) {
            name = "file";
        }
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }
}
