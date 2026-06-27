#![allow(dead_code)]

pub fn banned_wording() -> Vec<&'static str> {
    vec![
        "绝对安全",
        "一键修复所有问题",
        "一键加速",
        "深度优化",
        "彻底清理",
        "无风险扩容",
        "自动修复系统",
        "永久解决",
        "保证成功",
        "100% 恢复",
    ]
}

pub fn validate_wording(text: &str) -> Vec<String> {
    banned_wording()
        .into_iter()
        .filter(|word| text.contains(word))
        .map(str::to_string)
        .collect()
}
