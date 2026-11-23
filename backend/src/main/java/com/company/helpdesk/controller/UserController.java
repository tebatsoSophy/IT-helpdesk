package com.company.helpdesk.controller;

import com.company.helpdesk.dto.*;
import com.company.helpdesk.entity.Role;
import com.company.helpdesk.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> list(@RequestParam(required = false) Role role) {
        return userService.list(role);
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return userService.update(id, request);
    }

    @PatchMapping("/users/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse activate(@PathVariable Long id) {
        return userService.setActive(id, true);
    }

    @PatchMapping("/users/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse deactivate(@PathVariable Long id) {
        return userService.setActive(id, false);
    }

    /** Self-service profile update (name and, optionally, password). */
    @PutMapping("/users/me")
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(request);
    }

    @GetMapping("/technicians")
    @PreAuthorize("hasAnyRole('TECHNICIAN','ADMIN')")
    public List<UserResponse> technicians() {
        return userService.technicians();
    }
}
