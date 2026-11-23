package com.company.helpdesk.repository;

import com.company.helpdesk.entity.Comment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = {"author", "ticket"})
    List<Comment> findByTicketIdOrderByCreatedAtAscIdAsc(Long ticketId);

    @EntityGraph(attributePaths = {"author", "ticket"})
    List<Comment> findByTicketIdAndInternalFalseOrderByCreatedAtAscIdAsc(Long ticketId);
}
