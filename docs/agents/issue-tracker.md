# 问题追踪器：本地 Markdown

这个仓库的 issues 和 PRD 以 Markdown 文件形式保存在 `.scratch/` 下。

## 约定

- 每个功能一个目录：`.scratch/<feature-slug>/`
- PRD 文件为：`.scratch/<feature-slug>/PRD.md`
- 实现类 issue 放在：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，编号从 `01` 开始
- 任务状态写在 issue 文件顶部附近的一行 `Status:` 中
- 评论和讨论历史追加到文件底部的 `## Comments` 段落下

## 当 skill 说“发布到 issue tracker”

在 `.scratch/<feature-slug>/` 下创建新文件，必要时先创建目录。

## 当 skill 说“取出相关 ticket”

读取对应路径下的文件。用户通常会直接给出路径或 issue 编号。
