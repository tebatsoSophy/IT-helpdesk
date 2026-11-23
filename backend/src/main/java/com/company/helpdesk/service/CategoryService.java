package com.company.helpdesk.service;

import com.company.helpdesk.dto.CategoryRequest;
import com.company.helpdesk.dto.CategoryResponse;
import com.company.helpdesk.entity.Category;
import com.company.helpdesk.exception.BusinessRuleException;
import com.company.helpdesk.exception.ResourceNotFoundException;
import com.company.helpdesk.repository.CategoryRepository;
import com.company.helpdesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categories;
    private final TicketRepository tickets;

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categories.findAllByOrderByNameAsc().stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw new BusinessRuleException("A category named \"%s\" already exists".formatted(name));
        }
        Category c = new Category();
        c.setName(name);
        c.setDescription(blankToNull(request.description()));
        return CategoryResponse.from(categories.save(c));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category c = find(id);
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessRuleException("A category named \"%s\" already exists".formatted(name));
        }
        c.setName(name);
        c.setDescription(blankToNull(request.description()));
        return CategoryResponse.from(c);
    }

    @Transactional
    public void delete(Long id) {
        Category c = find(id);
        if (tickets.existsByCategoryId(id)) {
            throw new BusinessRuleException("This category is used by existing tickets and cannot be deleted");
        }
        categories.delete(c);
    }

    private Category find(Long id) {
        return categories.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category %d was not found".formatted(id)));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
