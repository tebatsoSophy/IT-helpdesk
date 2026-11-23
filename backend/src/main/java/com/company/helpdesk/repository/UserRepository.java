package com.company.helpdesk.repository;

import com.company.helpdesk.entity.Role;
import com.company.helpdesk.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(Role role);

    List<User> findAllByOrderByFullNameAsc();

    List<User> findByRoleOrderByFullNameAsc(Role role);

    List<User> findByRoleAndActiveTrueOrderByFullNameAsc(Role role);
}
