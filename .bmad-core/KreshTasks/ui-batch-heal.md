# UI Batch Heal System

## Overview
Automated batch UI healing system that reads `/docs/ui/page-list.md` and executes `ui-single-page-heal.md` for every page listed. Supports all specialized focus flags and provides consolidated reporting with intelligent Git integration.

## Global Configuration Variables

```bash
# =================================================================
# UI BATCH HEAL SYSTEM - CONFIGURATION
# =================================================================

# APPLICATION SETTINGS
APPLICATION_URL = "https://wikigaialab.vercel.app/"           # Main application URL
DOCS_PATH = "/docs/ui/"                                       # UI documentation directory
PAGE_LIST_FILE = "/docs/ui/page-list.md"                     # Source file with page list
HEAL_THRESHOLD = 90                                          # Minimum score required (1-100 scale)

# BATCH PROCESSING SETTINGS
BATCH_SIZE = 3                                               # Number of pages to process simultaneously
DELAY_BETWEEN_PAGES = 2000                                   # Milliseconds delay between page processing
CONTINUE_ON_ERROR = true                                     # Continue batch if single page fails
STOP_ON_CRITICAL_ERROR = true                               # Stop batch on authentication/system errors

# IMPLEMENTATION SETTINGS
AUTO_IMPLEMENT = true                                        # Automatically implement fixes for all pages
AUTO_COMMIT = true                                          # Automatically commit changes per page
AUTO_PUSH = false                                           # Push only at end of batch (not per page)
BATCH_COMMIT_STRATEGY = "individual"                        # Options: individual, consolidated, feature-branch

# AUTHENTICATION SETTINGS (inherited)
AUTH_METHOD = "login"                                       # Authentication method
LOGIN_URL = "auto-detect"                                   # Auto-detect login endpoints
TEST_EMAIL = "playwright-ui-batch@tempmail.dev"            # Batch test user email
TEST_PASSWORD = "UIBatchHealing2025!"                      # Batch test user password
STORAGE_STATE_FILE = "/docs/ui/auth-state.json"            # Browser session storage

# PLAYWRIGHT SETTINGS
VIEWPORT_WIDTH = 1920                                       # Browser viewport width
VIEWPORT_HEIGHT = 1080                                      # Browser viewport height
SCREENSHOT_FORMAT = "PNG"                                   # Screenshot format
HEADLESS_MODE = false                                       # Browser visibility mode
BROWSER_TYPE = "chromium"                                   # Browser engine
PARALLEL_BROWSERS = 1                                       # Number of parallel browser instances

# SPECIALIZED FOCUS FLAGS (passed to individual healing)
INTERACTION_FOCUS = false                                   # --interaction flag
BRAND_IDENTITY_FOCUS = false                               # --brand-identity flag
ICONS_FOCUS = false                                        # --icons flag
SPECS_FOCUS = false                                        # --specs flag
MENU_FOCUS = false                                         # --menu flag
MULTI_FOCUS_MODE = false                                   # Multiple flags active

# BATCH REPORTING SETTINGS
GENERATE_BATCH_REPORT = true                               # Generate comprehensive batch report
SHOW_PROGRESS_INDICATORS = true                           # Show real-time progress
SAVE_INDIVIDUAL_REPORTS = true                            # Save individual page reports
CONSOLIDATE_SCREENSHOTS = true                            # Organize all screenshots by batch
EXPORT_BATCH_METRICS = true                               # Export aggregated metrics

# GIT BATCH INTEGRATION
BATCH_BRANCH_NAME = "ui-batch-heal-{timestamp}"           # Branch name for batch healing
CREATE_BATCH_PR = true                                     # Create pull request for entire batch
SQUASH_COMMITS = false                                     # Keep individual commits vs squash
FINAL_BATCH_PUSH = true                                    # Push all changes at end
ROLLBACK_ON_BATCH_FAILURE = true                          # Rollback entire batch if critical failure

# OUTPUT SETTINGS
BATCH_OUTPUT_DIR = "/docs/ui/batch-healing-reports/"       # Batch reports directory
ORGANIZE_BY_TIMESTAMP = true                              # Create timestamped subdirectories
SAVE_PROGRESS_LOG = true                                  # Save detailed progress log
EXPORT_SUMMARY_METRICS = true                            # Export batch summary metrics
```

## Quick Start Commands

### Basic Batch Healing
```bash
# Heal all pages in page-list.md
/ui-batch-heal

# Heal all pages with specific focus
/ui-batch-heal --interaction
/ui-batch-heal --brand-identity
/ui-batch-heal --specs
```

### Multi-Focus Batch Healing
```bash
# Multiple focus areas across all pages
/ui-batch-heal --interaction --brand-identity
/ui-batch-heal --specs --menu
/ui-batch-heal --interaction --brand-identity --icons --specs --menu
```

### Advanced Batch Options
```bash
# Batch with custom settings
/ui-batch-heal --interaction --batch-size 5
/ui-batch-heal --brand-identity --continue-on-error false
/ui-batch-heal --specs --parallel-browsers 2
```

## Page List File Format

The system reads `/docs/ui/page-list.md` with this expected format:

```markdown
# UI Pages List & Authentication

## AUTHENTICATION CREDENTIALS
TEST_EMAIL = "playwright-ui-test@tempmail.dev"
TEST_PASSWORD = "UIHealing2025!"
LOGIN_URL = "https://your-app.com/login"
SIGNUP_URL = "https://your-app.com/signup"
AUTH_METHOD = "login"

## SCREENS LIST
# Format: URL_PATH | SCREEN_NAME | DESCRIPTION | AUTH_REQUIRED | PRIORITY
/homepage | homepage | Main landing page | false | high
/login | login | User authentication screen | false | medium
/signup | signup | User registration | false | medium
/dashboard | dashboard | User dashboard after login | true | high
/profile | profile | User profile management | true | medium
/settings | settings | Application settings | true | low
/admin | admin | Admin panel | true | high
/search | search | Search interface | true | medium
/help | help | Help documentation | false | low
# Comments start with #
```

### Page Priority Support (Optional)
```markdown
# PRIORITY can be: high, medium, low, critical
# Processing order: critical → high → medium → low
# Skip low priority pages if time constraints: SKIP_LOW_PRIORITY = true
```

## Batch Processing Workflow

### Phase 1: Initialization & Page Discovery

**1. Parse Command & Configure Flags**
```bash
# Extract and validate flags from command
COMMAND_FLAGS = [parsed: --interaction, --brand-identity, --icons, --specs, --menu]
MULTI_FOCUS_MODE = [true if multiple flags]
FLAG_STRING = [join flags for passing to ui-single-page-heal]

# Set batch-specific configurations
if MULTI_FOCUS_MODE:
    COMPLEXITY_MULTIPLIER = 1.5  # More time per page
    BATCH_SIZE = max(1, BATCH_SIZE - 1)  # Reduce parallelism
```

**2. Read & Parse Page List File**
```bash
# Load and validate page-list.md
if not exists(PAGE_LIST_FILE):
    ERROR: "Page list file not found at {PAGE_LIST_FILE}"
    EXIT with instructions to create file

# Parse file structure
AUTHENTICATION_CONFIG = [extract auth credentials]
PAGE_LIST = [extract all valid page entries]
TOTAL_PAGES = count(PAGE_LIST)

# Validate page entries
FOR each page in PAGE_LIST:
    validate_format(URL_PATH, SCREEN_NAME, DESCRIPTION, AUTH_REQUIRED)
    check_url_accessibility(APPLICATION_URL + URL_PATH)
```

**3. Batch Setup & Authentication**
```bash
# Setup batch environment
create_directory(BATCH_OUTPUT_DIR)
if ORGANIZE_BY_TIMESTAMP:
    BATCH_SESSION_DIR = BATCH_OUTPUT_DIR + "/batch-{timestamp}/"
    create_directory(BATCH_SESSION_DIR)

# Initialize authentication using config from page-list.md
BATCH_AUTH_CONFIG = merge(GLOBAL_AUTH, PAGE_LIST_AUTH)
setup_authentication(BATCH_AUTH_CONFIG)

# Git branch setup for batch
if BATCH_COMMIT_STRATEGY == "feature-branch":
    BATCH_BRANCH = BATCH_BRANCH_NAME.replace("{timestamp}", current_timestamp)
    git checkout -b BATCH_BRANCH
```

### Phase 2: Batch Processing Execution

**1. Progress Initialization**
```bash
# Initialize batch progress tracking
BATCH_START_TIME = current_timestamp
PROGRESS_TRACKER = {
    total_pages: TOTAL_PAGES,
    processed: 0,
    healed: 0,
    partial_healed: 0,
    failed: 0,
    skipped: 0,
    current_phase: "processing"
}

# Display batch start summary
DISPLAY_BATCH_START_SUMMARY:
```
🚀 UI BATCH HEAL STARTED
─────────────────────────────────────
Total Pages: {TOTAL_PAGES}
Active Flags: {COMMAND_FLAGS}
Batch Strategy: {BATCH_COMMIT_STRATEGY}
Expected Duration: ~{estimated_time} minutes

📋 PROCESSING ORDER:
{list_pages_by_priority}
```

**2. Page-by-Page Processing Loop**
```bash
# Sort pages by priority if specified
if PAGE_PRIORITIES_DETECTED:
    PAGE_LIST = sort_by_priority(PAGE_LIST)  # critical → high → medium → low

# Process each page using ui-single-page-heal
FOR each page in PAGE_LIST:
    # Update progress
    PROGRESS_TRACKER.current_page = page
    PROGRESS_TRACKER.processed += 1
    
    # Display current progress
    if SHOW_PROGRESS_INDICATORS:
        display_progress_update(page, PROGRESS_TRACKER)
    
    # Execute single page healing with flags
    page_result = execute_single_page_heal(page, COMMAND_FLAGS)
    
    # Process results and update tracking
    update_batch_tracking(page_result, PROGRESS_TRACKER)
    
    # Handle page-specific git commits
    if AUTO_COMMIT and page_result.status == "HEALED":
        commit_page_changes(page, page_result)
    
    # Error handling
    if page_result.status == "FAILED":
        handle_page_failure(page, page_result)
    
    # Delay between pages if configured
    if DELAY_BETWEEN_PAGES > 0:
        sleep(DELAY_BETWEEN_PAGES)
```

**3. Individual Page Healing Execution**
```bash
# For each page, execute ui-single-page-heal with flags
execute_single_page_heal(page, flags):
    # Build command with flags
    heal_command = "/ui-single-page-heal {page.url_path} {flags}"
    
    # Execute healing process
    result = {
        page: page,
        initial_score: 0,
        final_score: 0,
        status: "PROCESSING",
        improvements: [],
        git_commits: [],
        execution_time: 0,
        error_message: null
    }
    
    try:
        # Run single page heal with all flags
        heal_result = run_ui_single_page_heal(page.url_path, flags)
        
        # Capture results
        result.initial_score = heal_result.initial_score
        result.final_score = heal_result.final_score
        result.improvements = heal_result.improvements
        result.git_commits = heal_result.git_commits
        result.execution_time = heal_result.execution_time
        
        # Determine status
        if heal_result.final_score >= HEAL_THRESHOLD:
            result.status = "HEALED"
        elif heal_result.final_score > heal_result.initial_score:
            result.status = "PARTIAL_HEALED"
        else:
            result.status = "NO_IMPROVEMENT"
            
    except Exception as e:
        result.status = "FAILED"
        result.error_message = str(e)
        
        # Handle failure based on settings
        if CONTINUE_ON_ERROR:
            log_error_and_continue(page, e)
        else:
            raise BatchHealingException(f"Page {page} failed: {e}")
    
    return result
```

### Phase 3: Progress Tracking & Real-Time Reporting

**1. Live Progress Display**
```bash
# Real-time progress updates during batch processing
display_progress_update(current_page, progress):
```
🔄 BATCH HEALING PROGRESS
─────────────────────────────────────
Progress: [{progress.processed}/{progress.total_pages}] ({percentage}%)
Current: {current_page.screen_name} ({current_page.url_path})
Active Flags: {COMMAND_FLAGS}

📊 BATCH STATISTICS:
✅ Healed: {progress.healed}
⚠️ Partial: {progress.partial_healed}
❌ Failed: {progress.failed}
⏭️ Remaining: {progress.total_pages - progress.processed}

⏱️ Time: {elapsed_time} / ~{estimated_total_time}
🎯 Success Rate: {success_percentage}%

📋 CURRENT FOCUS AREAS:
{display_active_flags_with_weights}
```

**2. Error Handling & Recovery**
```bash
handle_page_failure(page, result):
    # Log detailed error information
    log_page_error(page, result.error_message)
    
    # Attempt recovery strategies
    if result.error_message.includes("authentication"):
        attempt_auth_recovery()
    elif result.error_message.includes("network"):
        retry_with_backoff(page)
    elif result.error_message.includes("timeout"):
        increase_timeout_and_retry(page)
    
    # Update batch status
    if STOP_ON_CRITICAL_ERROR and is_critical_error(result.error_message):
        abort_batch_with_rollback()
    else:
        mark_page_as_failed(page)
        continue_batch_processing()
```

### Phase 4: Git Integration & Batch Commits

**1. Individual vs Consolidated Commits**
```bash
# Individual commit strategy (default)
if BATCH_COMMIT_STRATEGY == "individual":
    FOR each successful page healing:
        git add {modified_files_for_page}
        git commit -m "UI-HEAL-BATCH: {page.screen_name} - {improvements_summary} [{flags}]"

# Consolidated commit strategy
elif BATCH_COMMIT_STRATEGY == "consolidated":
    # Accumulate all changes
    git add {all_modified_files_in_batch}
    git commit -m "UI-HEAL-BATCH: Batch healing {total_pages} pages - {overall_improvements} [{flags}]"

# Feature branch strategy
elif BATCH_COMMIT_STRATEGY == "feature-branch":
    # Individual commits on feature branch
    FOR each page:
        git add {page_files}
        git commit -m "UI-HEAL: {page.screen_name} [{flags}]"
    
    # Final batch summary commit
    git commit -m "UI-HEAL-BATCH: Summary - {healed_count}/{total_count} pages healed [{flags}]"
```

**2. Batch Push & Pull Request**
```bash
# Final git operations
if FINAL_BATCH_PUSH:
    if BATCH_COMMIT_STRATEGY == "feature-branch":
        git push origin {BATCH_BRANCH}
        
        if CREATE_BATCH_PR:
            create_pull_request({
                branch: BATCH_BRANCH,
                title: "UI Batch Heal: {healed_count} pages improved [{flags}]",
                description: generate_pr_description(BATCH_RESULTS),
                assignees: [get_ui_reviewers()],
                labels: ["ui-healing", "automated", flags...]
            })
    else:
        git push origin main
```

### Phase 5: Comprehensive Batch Reporting

**1. Batch Summary Generation**
```bash
generate_batch_report(BATCH_RESULTS):
    BATCH_REPORT = {
        session_info: {
            start_time: BATCH_START_TIME,
            end_time: current_timestamp,
            duration: calculate_duration(),
            total_pages: TOTAL_PAGES,
            active_flags: COMMAND_FLAGS
        },
        
        performance_summary: {
            healed_count: count_by_status("HEALED"),
            partial_healed_count: count_by_status("PARTIAL_HEALED"),
            failed_count: count_by_status("FAILED"),
            success_rate: calculate_success_rate(),
            average_improvement: calculate_avg_improvement()
        },
        
        flag_specific_analysis: generate_flag_analysis(COMMAND_FLAGS, BATCH_RESULTS),
        
        detailed_results: BATCH_RESULTS,
        
        git_integration: {
            commits_created: count_commits(),
            branch_name: BATCH_BRANCH,
            pull_request_url: PR_URL,
            files_modified: get_modified_files()
        },
        
        recommendations: generate_batch_recommendations(BATCH_RESULTS)
    }
```

**2. Consolidated Visual Report**
```bash
# Generate comprehensive batch report
BATCH_REPORT_STRUCTURE:
```

# 🎯 UI BATCH HEAL COMPREHENSIVE REPORT
Generated: {timestamp}
Duration: {duration}
Flags Applied: {COMMAND_FLAGS}

## 📊 EXECUTIVE SUMMARY
┌─────────────────────────┬─────────┬────────────┬─────────────┐
│ Metric                  │ Count   │ Percentage │ Target      │
├─────────────────────────┼─────────┼────────────┼─────────────┤
│ Total Pages Processed   │   {n}   │    100%    │     {n}     │
│ Successfully Healed     │   {n}   │     {%}    │    ≥90%     │
│ Partially Healed        │   {n}   │     {%}    │    <10%     │
│ Failed to Process       │   {n}   │     {%}    │     0%      │
│ Average Score Improve   │   +{n}  │     N/A    │    +15      │
└─────────────────────────┴─────────┴────────────┴─────────────┘

## 🎯 FOCUS AREAS PERFORMANCE
{if --interaction}
🎯 **Interaction Improvements**: {avg_interaction_improvement}/100
- Pages with interaction issues fixed: {count}
- Most common interaction improvements: {list}
- Cross-page consistency achieved: {percentage}%

{if --brand-identity}
🎨 **Brand Identity Improvements**: {avg_brand_improvement}/100
- Brand consistency violations fixed: {count}
- Typography corrections: {count}
- Color compliance improvements: {count}

{if --specs}
⚙️ **Technical Specifications**: {avg_specs_improvement}/100
- Code standards violations fixed: {count}
- Performance improvements: {count}
- Architecture compliance: {percentage}%

{if --menu}
🧭 **Navigation & Menus**: {avg_menu_improvement}/100
- Menu structure improvements: {count}
- Navigation flow fixes: {count}
- User flow consistency: {percentage}%

{if --icons}
🎨 **Icons & Graphics**: {avg_icons_improvement}/100
- Icon consistency fixes: {count}
- Graphics quality improvements: {count}
- Visual hierarchy enhancements: {count}

## 📋 DETAILED PAGE RESULTS
┌─────────────────────────┬────────┬────────┬──────────┬─────────────────┐
│ Page                    │ Before │ After  │ Status   │ Key Improvements│
├─────────────────────────┼────────┼────────┼──────────┼─────────────────┤
│ /homepage               │   75   │   95   │    ✅    │ Brand, Icons    │
│ /dashboard              │   68   │   92   │    ✅    │ Interaction     │
│ /profile                │   82   │   88   │    ⚠️    │ Partial fixes   │
│ /admin                  │   45   │   91   │    ✅    │ Specs, Menu     │
│ /settings               │   79   │   87   │    ⚠️    │ Manual review   │
└─────────────────────────┴────────┴────────┴──────────┴─────────────────┘

## 🔧 IMPLEMENTATION HIGHLIGHTS
### Most Impactful Changes:
1. **Brand Consistency**: {count} color corrections across {page_count} pages
2. **Interaction Patterns**: {count} UX improvements standardized
3. **Navigation Flow**: {count} menu structure enhancements
4. **Code Quality**: {count} technical specification fixes
5. **Icon Standardization**: {count} iconography improvements

### Cross-Page Patterns Fixed:
- {pattern_1}: Fixed on {page_list}
- {pattern_2}: Standardized across {page_list}
- {pattern_3}: Improved consistency in {page_list}

## 📦 GIT INTEGRATION SUMMARY
✅ **Commits Created**: {commit_count} individual improvements
✅ **Branch**: {branch_name}
✅ **Pull Request**: #{pr_number} - Ready for review
✅ **Files Modified**: {file_count} ({file_list})
✅ **Rollback Available**: Full batch rollback possible

## 🎯 REMAINING ACTIONS
### High Priority:
🔲 Manual review needed for {count} pages with partial healing
🔲 Cross-browser testing for advanced interactions
🔲 Performance validation for {count} heavy modifications

### Medium Priority:
🔲 A11y specialist review for complex components
🔲 UX designer validation for brand-critical pages
🔲 QA testing for user flow modifications

### Low Priority:
🔲 Documentation updates for new patterns
🔲 Training materials for maintained standards
🔲 Monitoring setup for regression detection

## 📈 SUCCESS METRICS
- **Batch Success Rate**: {percentage}% (Target: ≥90%)
- **Average Score Improvement**: +{points} points per page
- **Flag-Specific Success**: {breakdown_by_flag}
- **Time Efficiency**: {minutes_per_page} minutes per page average
- **Zero Regressions**: All improvements maintain existing functionality

## 🚀 NEXT STEPS
1. **Review Pull Request** #{pr_number} for final approval
2. **Schedule QA Testing** for {count} pages with significant changes
3. **Monitor Live Performance** post-deployment
4. **Plan Next Batch** for {remaining_pages} remaining pages
5. **Update Documentation** with new standards implemented

---
**Batch healing completed successfully!** 
Ready for review and deployment. 🎉
```

## Error Handling & Recovery Strategies

### Batch-Level Error Handling
```bash
# Critical error scenarios
CRITICAL_ERRORS = [
    "authentication_system_failure",
    "repository_corruption", 
    "application_completely_inaccessible",
    "playwright_system_failure"
]

# Recovery strategies
handle_batch_critical_error(error_type):
    if error_type == "authentication_system_failure":
        attempt_auth_recovery()
        if recovery_failed:
            abort_batch_with_notification()
    
    elif error_type == "repository_corruption":
        if ROLLBACK_ON_BATCH_FAILURE:
            execute_full_batch_rollback()
        create_incident_report()
    
    elif error_type == "application_completely_inaccessible":
        pause_batch_execution()
        notify_development_team()
        wait_for_manual_intervention()
```

### Partial Failure Management
```bash
# Handle individual page failures
handle_page_failure_in_batch(page, error):
    # Log failure details
    log_page_failure(page, error)
    
    # Attempt page-specific recovery
    if error.type == "page_not_found":
        mark_page_as_deprecated(page)
        update_page_list_file()
    
    elif error.type == "authorization_denied":
        verify_page_auth_requirements(page)
        attempt_elevated_auth()
    
    elif error.type == "implementation_failure":
        revert_page_changes(page)
        mark_for_manual_review(page)
    
    # Continue with next page
    if CONTINUE_ON_ERROR:
        continue_to_next_page()
    else:
        pause_for_manual_intervention()
```

## Usage Examples

### Basic Batch Healing
```bash
# Command
/ui-batch-heal

# Process Overview
1. Read all pages from /docs/ui/page-list.md
2. Execute ui-single-page-heal for each page
3. Standard evaluation (no specialized focus)
4. Individual commits per page
5. Final batch report and PR creation

# Expected Pages Processed (example)
- /homepage: 78/100 → 94/100 ✅
- /dashboard: 65/100 → 91/100 ✅ 
- /profile: 83/100 → 89/100 ⚠️
- /admin: 52/100 → 93/100 ✅
- Total: 7/10 pages healed, 3 partial
```

### Interaction-Focused Batch Healing
```bash
# Command
/ui-batch-heal --interaction

# Process Overview
1. Apply --interaction flag to every page healing
2. 70% evaluation weight on UX/interaction compliance
3. Priority fixes: hover states, transitions, feedback mechanisms
4. Cross-page interaction pattern standardization
5. Interaction-focused batch report

# Expected Results
🎯 Interaction Focus Results:
- Hover states standardized across 8/10 pages
- Form validation improved on 5/10 pages  
- Navigation transitions enhanced on 10/10 pages
- User feedback mechanisms added to 6/10 pages
- Overall interaction consistency: 92%
```

### Multi-Focus Comprehensive Healing
```bash
# Command  
/ui-batch-heal --interaction --brand-identity --specs

# Process Overview
1. Apply multiple flags to each page (equal weight distribution)
2. Comprehensive evaluation: 23.3% each focus + 30% general
3. Cross-cutting improvements across all focus areas
4. Complex implementation with area-specific priorities
5. Multi-dimensional batch reporting

# Expected Results
🎯 Multi-Focus Results:
- Interaction compliance: 88% average across pages
- Brand identity consistency: 91% average across pages  
- Technical specifications: 85% average across pages
- Cross-area integration: 94% compatibility
- Overall site coherence significantly improved
```

### Large-Scale Batch with Custom Settings
```bash
# Command with advanced options
/ui-batch-heal --brand-identity --icons --batch-size 5 --parallel-browsers 2

# Process Overview
1. Process 5 pages simultaneously with 2 browser instances
2. Focus on brand consistency and iconography
3. Optimized for large page lists (50+ pages)
4. Parallel processing with coordination
5. Scalable batch management

# Performance Expectations
- Processing speed: ~2-3 minutes per page (parallel)
- Resource usage: Moderate (2 browsers)
- Coordination overhead: Minimal
- Success rate: 90%+ for brand/icon improvements
```

## Integration with UI Systems

### Compatibility Matrix
```bash
✅ **Full Integration**: 
- ui-single-page-heal.md (direct execution)
- Total UI Healing System (shared authentication)
- Playwright MCP (browser automation)
- Git workflows (branch management)

✅ **Inherited Configuration**:
- Authentication settings
- Documentation references (/docs/ui/)
- Scoring criteria and thresholds
- Flag definitions and weights

✅ **Enhanced Features**:
- Batch-specific Git strategies
- Cross-page pattern detection
- Consolidated reporting
- Progress tracking and recovery
```

### Required Dependencies
```bash
# System Requirements
1. ui-single-page-heal.md script (primary dependency)
2. /docs/ui/page-list.md file (page source)
3. Microsoft Playwright MCP (browser automation)
4. Git repository (version control integration)
5. /docs/ui/ documentation directory (evaluation standards)

# Optional Enhancements
1. CI/CD integration hooks
2. Notification systems (Slack, email)
3. Monitoring dashboards
4. Automated QA trigger systems
```

---

## Quick Reference Commands

```bash
# Basic batch healing
/ui-batch-heal                                    # All pages, standard evaluation

# Single focus batch healing  
/ui-batch-heal --interaction                      # UX focus on all pages
/ui-batch-heal --brand-identity                   # Brand focus on all pages
/ui-batch-heal --specs                           # Technical focus on all pages
/ui-batch-heal --menu                            # Navigation focus on all pages
/ui-batch-heal --icons                           # Iconography focus on all pages

# Multi-focus batch healing
/ui-batch-heal --interaction --brand-identity     # UX + Brand focus
/ui-batch-heal --specs --menu                     # Technical + Navigation focus
/ui-batch-heal --interaction --brand-identity --icons --specs --menu  # All focus areas

# Advanced options (if supported)
/ui-batch-heal --interaction --batch-size 5       # Custom batch size
/ui-batch-heal --brand-identity --continue-on-error false  # Stop on any error
/ui-batch-heal --specs --parallel-browsers 2      # Multiple browser instances
```

**Ready to heal your entire application with comprehensive batch processing and intelligent Git integration!** 🚀

Start batch healing now:
```bash
/ui-batch-heal [--flags]
```