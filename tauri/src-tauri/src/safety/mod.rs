pub mod confirmation;
pub mod disclaimer;
pub mod feature_explain;
pub mod report_warning;
pub mod risk;
pub mod wording;

#[allow(unused_imports)]
pub use confirmation::{confirmation_level_for, requires_triple_confirmation};
pub use disclaimer::disclaimer_text;
pub use feature_explain::{feature_risk_registry, get_feature_risk, FeatureRiskInfo};
#[allow(unused_imports)]
pub use risk::RiskLevel;
#[allow(unused_imports)]
pub use wording::{banned_wording, validate_wording};
