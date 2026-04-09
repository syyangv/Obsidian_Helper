---
aliases: []
tags: []
cssclasses:
  - hide-frontmatter
activity_tags: []
medical_tags:
day:
medication_long:
  - 吃药/Allegra
  - 吃药/Glycopyrrlate-1
  - 吃药/Junel1-20
  - 吃药/Acetylcysteine-NAC
  - 吃药/Zoloft-125mg
Supplements:
  - 吃药/保健品/鱼油
  - 吃药/保健品/维生素D
  - 吃药/保健品/维生素K
  - 吃药/保健品/镁-2
  - 吃药/保健品/PsylliumHusk-3
medication:
体重:
起起体重:
假期:
今日甚好: false
noBuy: false
小饭桌: false
---
![[dayOfWeek|no-title]]
![[dailyNavigation]]
![[genTOC]]
`BUTTON[add_task]` `BUTTON[addRefill]` `BUTTON[edit_体重]` `BUTTON[edit_起起体重]`
`BUTTON[therapy]` `BUTTON[swimming]` `BUTTON[qa_tv]` `BUTTON[qa_book]`

**🏮今日甚好🏮:** `INPUT[toggle(class(my-toggle)):今日甚好]`
**🪷今天没买🪷:** `INPUT[toggle(class(my-toggle)):noBuy]`
**🍱小饭桌🍱:** `INPUT[toggle(class(my-toggle)):小饭桌]` **🥡外卖🥡:** `INPUT[toggle(class(my-toggle)):外卖]` **🍴外食🍴:** `INPUT[toggle(class(my-toggle)):外食]`

# 1 日总结
```anyblock
[fold]
**⚖️体重:** `VIEW[{体重}]`  **🐾起起体重:** `VIEW[{起起体重}]`

**🎯 Activities:** `INPUT[inlineListSuggester(option(健身房), option(学习), option(下厨), option(看戏), option(出去玩)):activity_tags]`
	- 🎾 `INPUT[toggle:activity_tennis]` 🏸`INPUT[toggle:activity_squash]` 🥊 `INPUT[toggle:activity_boxing]` 🏋️ `INPUT[toggle:activity_weights]`
	- 🎤 `INPUT[toggle:activity_singing]`
	- 🏊 `INPUT[toggle:activity_swimming]`



**🏥 Medical:** `INPUT[inlineListSuggester(option(Dermatologist), option(Psychiatrist), option(Gastroenterologist), option(Dentist), option(Ophthalmologist), option(PCP), option(UrgentCare), option(OBGYN), option(Allergist), option(Urologist)):medical_tags]`

**💊长期Medication:** `INPUT[inlineListSuggester(option(吃药/Zoloft-125mg), option(吃药/Allegra), option(吃药/Glycopyrrlate-1), option(吃药/Junel1-20), option(吃药/Acetylcysteine-NAC)):medication_long]`

**🧪Supplements:** `INPUT[inlineListSuggester(option(吃药/保健品/鱼油), option(吃药/保健品/维生素D), option(吃药/保健品/维生素K), option(吃药/保健品/镁-2), option(吃药/保健品/PsylliumHusk-3)):Supplements]`

**😷吃药：**`INPUT[inlineListSuggester(option(吃药/Sudafed-Pseudoephedrine),option(吃药/泰诺)):medication]`

**🏖️假期：**`INPUT[inlineListSuggester(option(放假/PTO),option(放假/病假),option(放假/公共假期)):假期]`
## 1.1 🏠 家务任务
**🧹 地面清洁:** `INPUT[inlineListSuggester(option(吸尘), option(拖地)):hw_floor]`

**🛌 卧室:**`INPUT[inlineListSuggester(option(换床单), option(换被套)):hw_bedroom]`

**👚 衣物：**`INPUT[inlineListSuggester(option(洗衣服), option(叠衣服), option(整理/卖Mercari)):hw_laundry]`

**🚿 浴室清洁：**`INPUT[inlineListSuggester(option(刷马桶), option(洗手台), option(浴室地面)):hw_bathroom]`

**🔪 厨房清洁：**`INPUT[inlineListSuggester(option(厨房水池), option(整理/厨房台面)):hw_kitchen]`

**:DoFullTrash:替换：**`INPUT[inlineListSuggester(option(替换/猫砂盆liner), option(替换/空调滤网), option(替换/空气净化器filter)):hw_renew]`
```

# 2 笔记
```anyblock
[fold]

![[dailyModify.base|ordered-list]]
```

<%*
const moment = window.moment;
const baseDate = moment(tp.file.title, "YYYY-MM-DD");

const startDate = baseDate.clone().subtract(1, 'days').format("YYYY-MM-DD");
const endDate = baseDate.clone().add(7, 'days').format("YYYY-MM-DD");

tR +="```tasks\n";
tR += "not done\n";
tR += "filter by function task.status.symbol !== '>'\n";
tR += "path does not include 播客\n";
tR += "path does not include 周计划\n";
tR += `happens after ${startDate}\n`;
tR += `happens before ${endDate}\n`;
tR += "sort by due\n";
tR += "```\n";

tR +="```tasks\n";
tR += `done ${baseDate}\n`;
tR += "path does not include 播客\n";
tR += "path does not include 周计划\n";
tR += "```\n";
%>
![[日常工具-20250901.base#即将到期订阅]]

# 3 Event
## 3.1 课程
`BUTTON[updateCourse]`

## 3.2 看电视
`BUTTON[addShow]`

## 3.3 读书
`BUTTON[addBook]`
