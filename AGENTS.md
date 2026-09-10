# tsune-links — Codex

Claude Code は CLAUDE.md からこのファイルを import する。共通ルール本文を両CLI向けに複製しない。
各依頼の開始時に共通 vault の SHARED_WORKFLOW.md、projects/tsune-links/memory/ と handoffs/ の最新情報を確認し、確定事項を返答前に新しい共有 handoff へ保存する。

- 最初に `doc/CODEX_HANDOFF.md` と `doc/CHANGELOG.md` を読む。
- HTML/CSS/JavaScript の商品紹介サイト。生成元は隣接する sns プロジェクト。HTML 変更前に生成元への反映が必要か確認する。
- `CLAUDE.md` / `.claude/rules/` が追加されていれば関連ルールを読む。
- 全変更を `doc/CHANGELOG.md` に記録し、対象差分を secret スキャンして commit / push する。既存差分を巻き込まない。
- `.env`・認証情報・個人情報を記録・送信しない。ブラウザ確認は Browser Use CLI 2.0。Playwright 禁止。
