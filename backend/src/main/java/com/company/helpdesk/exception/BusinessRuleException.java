package com.company.helpdesk.exception;

/** A request that is well-formed but not allowed in the current state (maps to 409). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
