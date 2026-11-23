package com.company.helpdesk.service;

import com.company.helpdesk.dto.AuthResponse;
import com.company.helpdesk.dto.LoginRequest;
import com.company.helpdesk.dto.RegisterRequest;
import com.company.helpdesk.dto.UserResponse;
import com.company.helpdesk.entity.Role;
import com.company.helpdesk.entity.User;
import com.company.helpdesk.exception.BusinessRuleException;
import com.company.helpdesk.repository.UserRepository;
import com.company.helpdesk.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    @Value("${app.registration-enabled}")
    private boolean registrationEnabled;

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        return toResponse(user);
    }

    /** Self-registration always creates a regular USER. Technicians and admins are created by an admin. */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!registrationEnabled) {
            throw new AccessDeniedException("Self-registration is disabled. Ask an administrator for an account.");
        }
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleException("An account with that email already exists");
        }
        User user = new User();
        user.setEmail(email);
        user.setPassword(encoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(Role.USER);
        user.setActive(true);
        return toResponse(users.save(user));
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(jwtService.generateToken(user), "Bearer", UserResponse.from(user));
    }
}
