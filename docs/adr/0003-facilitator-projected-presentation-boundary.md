---
Status: superseded by ADR-0016
---

# 0003: Facilitator-Projected Presentation with Decoupled Participant Interaction

Canva presentations serve as the visual instructional content layer, but third-party embedding APIs lack multi-client synchronized slide control across disparate devices. We initially decided that the Canva presentation would be exclusively controlled and displayed on the facilitator's device (for screen-sharing or room projection), while participant devices rendered only the interactive activities, prompts, synchronized timers, and whiteboards when triggered by the facilitator. This decision was later superseded by ADR-0016 to support live participant screen projection with configurable interactive or presenter-synchronized slide navigation and real-time presentation live chat.
