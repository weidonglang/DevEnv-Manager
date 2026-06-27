#![allow(dead_code)]

pub fn report_warning_footer() -> &'static str {
    "## 风险与限制\n\n- 本报告基于当前扫描时刻生成，环境可能已经变化。\n- 执行修改类操作前请重新扫描并确认。\n- 本程序无法判断所有文件或配置的业务价值，删除、移动或修复前请确认用途。\n"
}
