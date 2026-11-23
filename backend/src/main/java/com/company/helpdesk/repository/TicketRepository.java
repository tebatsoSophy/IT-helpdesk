package com.company.helpdesk.repository;

import com.company.helpdesk.entity.Priority;
import com.company.helpdesk.entity.Ticket;
import com.company.helpdesk.entity.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    @Override
    @EntityGraph(attributePaths = {"category", "requester", "assignee"})
    Page<Ticket> findAll(Specification<Ticket> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "requester", "assignee"})
    Optional<Ticket> findWithDetailsById(Long id);

    boolean existsByCategoryId(Long categoryId);

    // ----- reports -----

    @Query("select t.status, count(t) from Ticket t group by t.status")
    List<Object[]> countByStatus();

    @Query("select t.priority, count(t) from Ticket t group by t.priority")
    List<Object[]> countByPriority();

    @Query("select c.name, count(t) from Ticket t left join t.category c group by c.name order by count(t) desc")
    List<Object[]> countByCategory();

    @Query("select t.status, count(t) from Ticket t where t.requester.id = :userId group by t.status")
    List<Object[]> countByStatusForRequester(@Param("userId") Long userId);

    @Query("select lower(t.title), count(t) from Ticket t group by lower(t.title) "
            + "having count(t) > 1 order by count(t) desc")
    List<Object[]> findCommonTitles(Pageable pageable);

    /** Rows of: priority, category name (nullable), createdAt, resolvedAt. */
    @Query("select t.priority, c.name, t.createdAt, t.resolvedAt from Ticket t left join t.category c "
            + "where t.resolvedAt is not null")
    List<Object[]> findResolvedRows();

    /** Rows of: assignee id, assignee name, status, createdAt, resolvedAt. */
    @Query("select a.id, a.fullName, t.status, t.createdAt, t.resolvedAt from Ticket t join t.assignee a")
    List<Object[]> findAssignedRows();

    long countByAssigneeIsNullAndStatusIn(Collection<TicketStatus> statuses);

    long countByPriorityAndStatusIn(Priority priority, Collection<TicketStatus> statuses);

    long countByPriorityAndStatusInAndCreatedAtBefore(Priority priority, Collection<TicketStatus> statuses,
                                                      LocalDateTime before);

    long countByAssigneeIdAndStatusIn(Long assigneeId, Collection<TicketStatus> statuses);

    long countByCreatedAtAfter(LocalDateTime after);

    long countByResolvedAtAfter(LocalDateTime after);
}
