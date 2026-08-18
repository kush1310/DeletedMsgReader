# Product Requirement Document (PRD)
## Project Name: NotiCatch (WhatsApp Notification Saver)
**Version:** 1.0  
**Date:** August 2026  

---

### 1. Introduction & Executive Summary
NotiCatch is an Android utility application designed to help users maintain a personal log of incoming and outgoing notifications, specifically tailored to capture and preserve WhatsApp messages before they are deleted by the sender using the "Delete for Everyone" feature. 

### 2. Objectives & Value Proposition
*   **Problem:** WhatsApp allows users to delete messages for everyone, causing recipient frustration or loss of critical context.
*   **Solution:** Capture notification payloads instantly in real time and store them locally.
*   **Value:** Provides an immutable history of text alerts independent of WhatsApp's server-side deletion events.

### 3. Target Audience & Persona
*   **Primary Users:** Android smartphone owners who require message accountability, log keeping, or context retrieval for business or personal communications.

### 4. Scope of the Product
*   **In-Scope:**
    *   Interception of system-level incoming WhatsApp text notifications.
    *   Local encrypted or sandboxed SQLite storage of message logs.
    *   User interface to filter, search, and view captured conversations.
*   **Out-of-Scope:**
    *   iOS (iPhone) application implementation due to sandbox limitations.
    *   Server-side database backup (all data must remain local for privacy).
    *   Bypassing WhatsApp encryption directly or modifying official client files.

### 5. Functional Requirements (FRs)
*   **FR-1: Notification Interception:** System must run a background `NotificationListenerService` to parse `com.whatsapp` notifications.
*   **FR-2: Data Extraction:** App must extract Sender Name, Message Content, and Timestamp from the notification extras bundle.
*   **FR-3: Local Storage:** Persist text entries into a local database immediately upon receipt.
*   **FR-4: UI Presentation:** Display logs grouped by contact thread, visually matching standard messaging application structures.
*   **FR-5: Search & Filter:** Allow users to filter text logs by string matching or specific contact filters.

### 6. Non-Functional Requirements (NFRs)
*   **Security & Privacy:** No internet communication permissions should be requested to guarantee zero data leakage.
*   **Performance:** Background processing must consume minimal CPU and <1% battery life per 24 hours.
*   **Reliability:** Auto-restart capability if the operating system terminates the background service due to memory pressure.

---

# Software Requirements Specification (SRS)
## Project Name: NotiCatch
**Version:** 1.0  

---

### 1. Introduction
This SRS document describes the complete system specifications, interfaces, and architecture for the NotiCatch Android architecture system.

### 2. Overall Description
#### 2.1 Product Perspective
NotiCatch operates entirely within the Android framework layer, utilizing official APIs to monitor the system status drawer. It is independent of WhatsApp Inc. and operates without modifying WhatsApp binaries.

#### 2.2 Product Functions
*   Request and verify system-level `BIND_NOTIFICATION_LISTENER_SERVICE` permissions.
*   Intercept background notification events (`onNotificationPosted`).
*   Match package identifier against targeted chat software.
*   Serialize data objects into Room/SQLite structural instances.

#### 2.3 User Classes and Characteristics
End-users must possess basic technical aptitude to navigate to Android System Settings and manually toggle the specialized "Notification Access" permission switch.

### 3. System Features
#### 3.1 Feature: Background Notification Listener Interface
*   **Description:** Continuously active Android framework service interface.
*   **Functional Stimulus:** Incoming OS intent broad-casted when an external application pushes an active notification block.
*   **Response Sequence:**
    1.  Verify bundle origin (`StatusBarNotification.getPackageName() == "com.whatsapp"`).
    2.  Extract string resources (`Notification.EXTRA_TITLE`, `Notification.EXTRA_TEXT`).
    3.  Generate system timestamp.
    4.  Invoke local DAO insert routine.

### 4. External Interface Requirements
#### 4.1 User Interfaces
Minimalist Material Design 3 interface featuring a two-tab view structure: Active Threads and Configuration Settings.
#### 4.2 Software Interfaces
*   **Operating System:** Android API Level 26 (Android 8.0 Oreo) through API Level 34+ (Android 14+).
*   **Database Engine:** Room Persistence Library abstraction layer over SQLite.

### 5. Technical Architecture & Data Design
```
[Android OS Notification Stream] 
               │
               ▼
   [NotificationListenerService]
               │ (Extract Text Bundle)
               ▼
      [Room Database / SQLite]
               │ (Local Query)
               ▼
     [Jetpack Compose UI Layer]
```

### 6. Safety and Security Constraints
*   **No Internet Permission:** The manifest file `AndroidManifest.xml` must omit `android.permission.INTERNET`. This provides hardware-enforced validation that user data cannot be uploaded to external command-and-control servers.
