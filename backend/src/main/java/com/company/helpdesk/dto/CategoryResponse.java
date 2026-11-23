package com.company.helpdesk.dto;

import com.company.helpdesk.entity.Category;

public record CategoryResponse(Long id, String name, String description) {

    public static CategoryResponse from(Category c) {
        return c == null ? null : new CategoryResponse(c.getId(), c.getName(), c.getDescription());
    }
}
