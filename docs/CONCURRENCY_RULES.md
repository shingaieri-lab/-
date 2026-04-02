# 同時実行・競合状態 ルール

## 基本方針

競合状態（race condition）とは、複数の処理が同時に走ることで予期しない結果になるバグのこと。
「たまに起きる不思議なバグ」の多くはここが原因。意識して実装することで防げる。

---

## API リクエスト

### 古いレスポンスの上書きを防ぐ

ユーザーが素早く操作したとき、後から送ったリクエストの結果が先に返ってくることがある（=古い結果で上書きされる）。

```ts
// 悪い例：どのリクエストの結果かわからない
useEffect(() => {
  fetchUser(userId).then(data => setUser(data));
}, [userId]);

// 良い例①：フラグでキャンセル
useEffect(() => {
  let cancelled = false;
  fetchUser(userId).then(data => {
    if (!cancelled) setUser(data);
  });
  return () => { cancelled = true; };
}, [userId]);

// 良い例②：AbortController（AbortController：リクエストを途中でキャンセルする仕組み）
useEffect(() => {
  const controller = new AbortController();
  fetchUser(userId, { signal: controller.signal })
    .then(data => setUser(data))
    .catch(err => { if (err.name !== 'AbortError') throw err; });
  return () => controller.abort();
}, [userId]);
```

### 連打・二重送信を防ぐ

- フォーム送信・ボタン操作中はボタンを `disabled` にする
- API 呼び出し中は `isLoading` フラグを立てて追加リクエストをブロックする

```ts
const [isSubmitting, setIsSubmitting] = useState(false);

async function handleSubmit() {
  if (isSubmitting) return; // 二重送信ガード
  setIsSubmitting(true);
  try {
    await submitForm(data);
  } finally {
    setIsSubmitting(false); // 成功・失敗どちらでも解除
  }
}
```

---

## 状態（State）の更新

### 前の状態を参照するときは関数形式を使う

`setState` に直接値を渡すと、クロージャ（closure：関数が作られたときの変数を覚えている仕組み）が古い値を参照してしまうことがある。

```ts
// 悪い例：count が古い値のまま参照されることがある
setCount(count + 1);

// 良い例：前の state を引数で受け取る
setCount(prev => prev + 1);
```

### 非同期処理の途中で state を参照しない

`await` の前後で state が変わっている可能性がある。

```ts
// 悪い例
async function handleDelete(id: string) {
  await deleteItem(id);
  setItems(items.filter(item => item.id !== id)); // await 後の items は古いかもしれない
}

// 良い例
async function handleDelete(id: string) {
  await deleteItem(id);
  setItems(prev => prev.filter(item => item.id !== id)); // prev は常に最新
}
```

---

## 楽観的更新（Optimistic Update）

楽観的更新とは「APIの結果を待たずにUIを先に更新して、失敗したら元に戻す」手法。
体感速度が向上するが、失敗時のロールバック（元に戻す処理）を必ず実装すること。

```ts
async function handleLike(postId: string) {
  // 先にUIを更新（楽観的更新）
  setPosts(prev =>
    prev.map(p => p.id === postId ? { ...p, liked: true, likeCount: p.likeCount + 1 } : p)
  );

  try {
    await likePost(postId);
  } catch {
    // 失敗したら元に戻す（ロールバック）
    setPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, liked: false, likeCount: p.likeCount - 1 } : p)
    );
    showErrorToast('いいねに失敗しました');
  }
}
```

---

## ローカルストレージ・共有リソース

- `localStorage` への読み書きはラッパー関数を通して行い、直接操作を散在させない
- 複数タブ間の同期が必要な場合は `storage` イベントを使う
  ```ts
  window.addEventListener('storage', (e) => {
    if (e.key === 'authToken') refreshAuthState();
  });
  ```

---

## タイマー・インターバル

- `setInterval` / `setTimeout` は必ずクリーンアップする

```ts
useEffect(() => {
  const id = setInterval(() => {
    fetchLatestData();
  }, 5000);
  return () => clearInterval(id); // コンポーネントが消えるときに止める
}, []);
```

- ポーリング（polling：定期的にサーバーに問い合わせること）中は前のリクエストが完了してから次を送る（並列にしない）

```ts
// 良い例：前のリクエストが終わってから次を実行
useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout>;
  let cancelled = false;

  async function poll() {
    if (cancelled) return;
    await fetchLatestData();
    if (!cancelled) timeoutId = setTimeout(poll, 5000);
  }

  poll();
  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
}, []);
```

---

## デバウンス・スロットル

- 入力フォームの検索など、頻繁に発火するイベントにはデバウンス（debounce：一定時間入力が止まってから実行）を使う
- スクロール・リサイズなどの連続イベントにはスロットル（throttle：一定間隔で間引いて実行）を使う

```ts
// デバウンス例（入力が止まって300ms後に検索）
const debouncedSearch = useMemo(
  () => debounce((query: string) => searchAPI(query), 300),
  []
);

// コンポーネントのアンマウント時にキャンセル
useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);
```
