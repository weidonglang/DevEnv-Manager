//! Junction-specific entry points live in `move_plan`/`migration`.
//!
//! This module keeps the cleanup namespace aligned with migration architecture.
//! The actual implementation is intentionally centralized so
//! source validation, copy verification, rollback records and reports cannot
//! diverge between direct Junction creation and regular move plans.
