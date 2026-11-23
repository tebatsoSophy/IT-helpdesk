package com.company.helpdesk.repository;

import com.company.helpdesk.entity.Attachment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    @EntityGraph(attributePaths = {"uploadedBy", "ticket"})
    List<Attachment> findByTicketIdOrderByUploadedAtAscIdAsc(Long ticketId);

    @EntityGraph(attributePaths = {"uploadedBy", "ticket"})
    Optional<Attachment> findWithTicketById(Long id);
}
