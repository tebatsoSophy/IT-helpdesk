package com.company.helpdesk.service;

import com.company.helpdesk.dto.*;
import com.company.helpdesk.entity.Role;
import com.company.helpdesk.entity.User;
import com.company.helpdesk.exception.BusinessRuleException;
import com.company.helpdesk.exception.ResourceNotFoundException;
import com.company.helpdesk.repository.UserRepository;
import com.company.helpdesk.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public List<UserResponse> list(Role role) {
        List<User> found = role == null ? users.findAllByOrderByFullNameAsc() : users.findByRoleOrderByFullNameAsc(role);
        return found.stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return UserResponse.from(find(id));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> technicians() {
        return users.findByRoleAndActiveTrueOrderByFullNameAsc(Role.TECHNICIAN).stream()
                .map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleException("An account with that email already exists");
        }
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setActive(true);
        return UserResponse.from(users.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        User me = currentUser.get();
        User user = find(id);
        if (user.getId().equals(me.getId()) && user.getRole() != request.role()) {
            throw new BusinessRuleException("You cannot change your own role");
        }
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        if (StringUtils.hasText(request.password())) {
            user.setPassword(encoder.encode(request.password()));
        }
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse setActive(Long id, boolean active) {
        User me = currentUser.get();
        User user = find(id);
        if (!active && user.getId().equals(me.getId())) {
            throw new BusinessRuleException("You cannot deactivate your own account");
        }
        user.setActive(active);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(UpdateProfileRequest request) {
        User me = currentUser.get();
        me.setFullName(request.fullName().trim());
        if (StringUtils.hasText(request.newPassword())) {
            if (!StringUtils.hasText(request.currentPassword())
                    || !encoder.matches(request.currentPassword(), me.getPassword())) {
                throw new BusinessRuleException("Your current password is incorrect");
            }
            me.setPassword(encoder.encode(request.newPassword()));
        }
        return UserResponse.from(me);
    }

    private User find(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User %d was not found".formatted(id)));
    }
}
