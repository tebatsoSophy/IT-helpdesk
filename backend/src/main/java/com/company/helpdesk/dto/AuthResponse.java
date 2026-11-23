package com.company.helpdesk.dto;

public record AuthResponse(String token, String tokenType, UserResponse user) {
}
