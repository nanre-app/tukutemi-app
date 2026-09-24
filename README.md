# tukutemi-app

お題の画像をもとに、生成AIでつくった画像を投稿して見せ合うWEBアプリです。

- 組織: nanre-app
- 構成: Next.js(App Router / JavaScript)+ Supabase(認証・データベース・画像保存)+ Vercel(公開)
- 機能: ログイン(メール+パスワード)/ 画像の投稿 / 投稿一覧(閲覧は誰でも可)
- 画面: 左に「お題」の画像、右に、そのお題に投稿された作品の一覧
- お題: 開始日時を登録しておくと、その時刻に自動で切り替わる(毎日・毎週など間隔は自由)

## フォルダ構成

```
tukutemi-app/
├─ app/
│  ├─ layout.js        全ページ共通のレイアウト
│  ├─ page.js          トップ画面
│  ├─ login/page.js    ログイン・新規登録
│  ├─ post/page.js     画像の投稿(ログイン必須)
│  └─ globals.css      見た目
├─ components/
│  ├─ Header.js        ヘッダー(ログイン状態の表示)
│  ├─ Board.js         左: 今回のお題 / 右: 作品一覧
│  └─ PostList.js      作品一覧
├─ lib/
│  ├─ supabaseClient.js   Supabase への接続
│  └─ themes.js           今回のお題の取得
└─ supabase/schema.sql テーブル・画像保存先・アクセス制限の設定
```

## ローカルでの起動(VS Code のターミナル)

```powershell
npm install
Copy-Item .env.local.example .env.local   # コピーして中身を書き換える
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

`.env.local` には Supabase の値(Project Settings > API)を設定します。

| 変数名 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon(公開)キー |

`.env.local` は `.gitignore` に入っているので、GitHub には上がりません。

## Supabase の準備

1. プロジェクト `tukutemi-app` を作成する
2. SQL Editor に `supabase/schema.sql` の全文を貼り付けて Run する
3. 最初のお題を登録する(下の「お題の登録」を参照)
4. Authentication > URL Configuration で、Site URL に Vercel の公開URLを設定する(ローカル確認用に `http://localhost:3000` も Redirect URLs に追加)

## Vercel での公開

1. GitHub の `nanre-app/tukutemi-app` を Vercel にインポートする
2. Environment Variables に上の2つの変数を登録する
3. Deploy する

## お題の登録(自動で切り替わる仕組み)

お題は Supabase の `themes` テーブルに登録します。`starts_at`(開始日時)を過ぎたお題のうち、いちばん新しいものが「今回のお題」として表示されます。

- 毎日切り替えたい場合: 1日ごとの開始日時でお題を登録する
- 毎週切り替えたい場合: 1週間ごとの開始日時でお題を登録する
- 開始前のお題は、画面にも API にも出ません。先にまとめて登録しておけます

登録の手順(Supabase ダッシュボード):

1. Storage > `theme-images` バケットに、お題の画像をアップロードする(例: `2026-09-22.png`)
2. SQL Editor で次を実行する(日本時間 0 時開始の例)

```sql
insert into public.themes (title, image_path, starts_at)
values ('海辺の夜の図書館', '2026-09-22.png', '2026-09-22 00:00:00+09');
```

Table Editor の `themes` テーブルから行を追加してもかまいません。
