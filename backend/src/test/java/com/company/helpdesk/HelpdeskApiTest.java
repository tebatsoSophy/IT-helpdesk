package com.company.helpdesk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** End-to-end walk through the ticket lifecycle with real security and an in-memory H2 database. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HelpdeskApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper json;

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/tickets")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "admin@helpdesk.local", "password", "wrong-password"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ticketLifecycleRespectsRoles() throws Exception {
        String admin = login("admin@helpdesk.local", "Admin123!");

        // Admin creates a technician.
        mvc.perform(post("/api/users").header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "tess@example.com", "password", "Password123!",
                                "fullName", "Tess Tech", "role", "TECHNICIAN"))))
                .andExpect(status().isCreated());
        String tech = login("tess@example.com", "Password123!");

        // A new user registers.
        MvcResult reg = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "uma@example.com", "password", "Password123!", "fullName", "Uma User"))))
                .andExpect(status().isCreated()).andReturn();
        String user = tree(reg).get("token").asText();

        // Regular users cannot reach admin endpoints or reports.
        mvc.perform(get("/api/users").header("Authorization", bearer(user))).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/summary").header("Authorization", bearer(user))).andExpect(status().isForbidden());

        // The user opens a ticket: OPEN and unassigned.
        MvcResult created = mvc.perform(post("/api/tickets").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("title", "Laptop will not start", "description", "Black screen on boot",
                                "priority", "HIGH"))))
                .andExpect(status().isCreated()).andReturn();
        JsonNode ticket = tree(created);
        long id = ticket.get("id").asLong();
        assertEquals("OPEN", ticket.get("status").asText());
        assertTrue(ticket.get("assignee").isNull());

        // Users cannot resolve; the technician claims the ticket and resolves it.
        mvc.perform(post("/api/tickets/" + id + "/resolve").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("resolutionNotes", "x"))))
                .andExpect(status().isForbidden());
        long techId = tree(mvc.perform(get("/api/auth/me").header("Authorization", bearer(tech))).andReturn()).get("id").asLong();
        mvc.perform(patch("/api/tickets/" + id + "/assign").header("Authorization", bearer(tech))
                        .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("assigneeId", techId))))
                .andExpect(status().isOk());

        // Internal notes: users cannot write them and never see them.
        mvc.perform(post("/api/tickets/" + id + "/comments").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("content", "secret", "internal", true))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/tickets/" + id + "/comments").header("Authorization", bearer(tech))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("content", "Likely a dead battery", "internal", true))))
                .andExpect(status().isCreated());
        MvcResult userView = mvc.perform(get("/api/tickets/" + id + "/comments").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andReturn();
        assertEquals(0, tree(userView).size());
        MvcResult techView = mvc.perform(get("/api/tickets/" + id + "/comments").header("Authorization", bearer(tech)))
                .andExpect(status().isOk()).andReturn();
        assertEquals(1, tree(techView).size());

        MvcResult resolved = mvc.perform(post("/api/tickets/" + id + "/resolve").header("Authorization", bearer(tech))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("resolutionNotes", "Replaced the battery"))))
                .andExpect(status().isOk()).andReturn();
        assertEquals("RESOLVED", tree(resolved).get("status").asText());
        assertFalse(tree(resolved).get("resolvedAt").isNull());

        // The requester confirms and closes it; a closed ticket is frozen.
        MvcResult closed = mvc.perform(post("/api/tickets/" + id + "/close").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andReturn();
        assertEquals("CLOSED", tree(closed).get("status").asText());
        mvc.perform(patch("/api/tickets/" + id + "/status").header("Authorization", bearer(tech))
                        .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("status", "OPEN"))))
                .andExpect(status().isConflict());

        // Another user cannot see this ticket at all.
        MvcResult other = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", "olu@example.com", "password", "Password123!", "fullName", "Olu Other"))))
                .andReturn();
        mvc.perform(get("/api/tickets/" + id).header("Authorization", bearer(tree(other).get("token").asText())))
                .andExpect(status().isNotFound());

        // History records the whole journey, and the admin summary reflects the closed ticket.
        MvcResult history = mvc.perform(get("/api/tickets/" + id + "/history").header("Authorization", bearer(admin)))
                .andExpect(status().isOk()).andReturn();
        assertTrue(tree(history).size() >= 4);
        MvcResult summary = mvc.perform(get("/api/reports/summary").header("Authorization", bearer(admin)))
                .andExpect(status().isOk()).andReturn();
        assertTrue(tree(summary).get("closed").asLong() >= 1);
    }

    // ---- helpers

    private String login(String email, String password) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andReturn();
        return tree(r).get("token").asText();
    }

    private String body(Object o) throws Exception {
        return json.writeValueAsString(o);
    }

    private JsonNode tree(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString());
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
