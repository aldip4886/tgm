---
Status: accepted
---

# 0016: Interactive Participant Screen Projection and Real-Time Presentation Live Chat

Remote and hybrid training participants need to view projected presentation decks directly on their own devices while engaging with the facilitator and peers, and facilitators need fine-grained control over whether participants can browse slides freely or must follow the presenter's exact slide. We decided to broadcast live presentation projection state, slide index synchronization (`presentation:slide_change`), and real-time presentation live chat (`presentation:chat_updated`) over Socket.IO across the Facilitator Dashboard, Participant View, and Projector View. When `allowInteractiveNavigation` is disabled, participant viewers lock navigation controls and synchronize their active slide (`#N` / `#page=N`) with the facilitator's stepper; when enabled, participants can independently navigate the deck in a floating/fullscreen viewer while participating in toggleable real-time presentation chat with inline facilitator feedback, points, and badges.
