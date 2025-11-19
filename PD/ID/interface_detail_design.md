# Interface Design

## Interface Design



【URI】  
GET /menu  
このエンドポイントは、公開アプリケーション（Web Public）から料理メニューの一覧を取得するために使用されます。ログイン認証は不要であり、すべての顧客がアクセス可能です。リクエストには特定のパラメータは含まれず、メニューの全項目が返されます。

【Application name】  
API Backend  

【Function name】  
get_menu_list  

【Input】  
このエンドポイントは、リクエストに特定の入力を必要としません。クライアントからのGETリクエストを受け取り、データベースに保存されている料理情報を取得します。料理情報には、料理名、価格、説明、提供状態（available、limited、sold_out）、および画像URLが含まれます。リクエストは、認証トークンを必要とせず、公開されたメニュー情報のみを返します。

【Output】  
レスポンスはJSON形式で提供され、料理メニューの一覧が含まれます。各料理項目には以下の情報が含まれます：  
- `id`: 料理の一意の識別子。  
- `name`: 料理名。  
- `price`: 料理の価格。  
- `description`: 料理の説明（任意項目）。  
- `state`: 提供状態（available、limited、sold_out）。  
- `image_url`: 料理画像のURL（任意項目）。  

レスポンスはデータベースから取得された最新の情報を基に構成され、提供状態がリアルタイムで反映されます。

【Response Code】  
成功した場合、HTTPステータスコード200が返されます。データベース接続エラーが発生した場合、HTTPステータスコード500が返され、エラーメッセージが含まれます。データが存在しない場合でも、空のリストが返されます（HTTPステータスコード200）。  

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "GET",
  "path": "/menu",
  "headers": {
    "Content-Type": "application/json"
  },
  "query": null,
  "data": null
}
```

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": [
    {
      "id": 1,
      "name": "パスタ",
      "price": 1200,
      "description": "トマトソースのパスタ",
      "state": "available",
      "image_url": "https://example.com/images/pasta.jpg"
    },
    {
      "id": 2,
      "name": "ステーキ",
      "price": 2500,
      "description": "ジューシーなビーフステーキ",
      "state": "limited",
      "image_url": "https://example.com/images/steak.jpg"
    }
  ]
}
```

レスポンス（データベースエラー時）:  
```json
{
  "status_code": 500,
  "error": {
    "message": "データベース接続エラーが発生しました。後ほど再試行してください。",
    "code": "DB_CONNECTION_ERROR"
  }
}
```

---

【URI】  
GET /menu/search  
このエンドポイントは、公開アプリケーション（Web Public）から料理名を基にメニュー項目を検索するために使用されます。ログイン認証は不要であり、顧客が料理名を入力して検索結果を取得できます。

【Application name】  
API Backend  

【Function name】  
search_menu_items  

【Input】  
リクエストにはクエリパラメータ`query`が含まれます。このパラメータは検索対象の料理名を指定します。システムはこのパラメータを受け取り、データベース内で部分一致検索を実行します。検索はケースインセンシティブで行われ、結果は料理名の一致度に基づいて返されます。

【Output】  
レスポンスはJSON形式で提供され、検索結果の料理項目が含まれます。各料理項目には以下の情報が含まれます：  
- `id`: 料理の一意の識別子。  
- `name`: 料理名。  
- `price`: 料理の価格。  
- `description`: 料理の説明（任意項目）。  
- `state`: 提供状態（available、limited、sold_out）。  
- `image_url`: 料理画像のURL（任意項目）。  

検索結果が存在しない場合、空のリストが返されます。

【Response Code】  
成功した場合、HTTPステータスコード200が返されます。クエリパラメータが欠落している場合、HTTPステータスコード400が返され、エラーメッセージが含まれます。データベース接続エラーが発生した場合、HTTPステータスコード500が返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "GET",
  "path": "/menu/search",
  "headers": {
    "Content-Type": "application/json"
  },
  "query": {
    "query": "パスタ"
  },
  "data": null
}
```

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": [
    {
      "id": 1,
      "name": "パスタ",
      "price": 1200,
      "description": "トマトソースのパスタ",
      "state": "available",
      "image_url": "https://example.com/images/pasta.jpg"
    }
  ]
}
```

レスポンス（クエリ欠落時）:  
```json
{
  "status_code": 400,
  "error": {
    "message": "検索クエリが指定されていません。",
    "code": "MISSING_QUERY_PARAMETER"
  }
}
```

レスポンス（データベースエラー時）:  
```json
{
  "status_code": 500,
  "error": {
    "message": "データベース接続エラーが発生しました。後ほど再試行してください。",
    "code": "DB_CONNECTION_ERROR"
  }
}
```

---

【URI】  
GET /menu/sort  
このエンドポイントは、公開アプリケーション（Web Public）から料理メニューを指定された基準で並び替えるために使用されます。ログイン認証は不要であり、顧客が料理名または価格を基準にメニューをソートできます。

【Application name】  
API Backend  

【Function name】  
sort_menu_items  

【Input】  
リクエストにはクエリパラメータ`sort_by`と`order`が含まれます。  
- `sort_by`: 並び替えの基準（`name`または`price`）。  
- `order`: 並び替えの順序（`asc`または`desc`）。  

システムはこれらのパラメータを受け取り、データベース内で指定された基準と順序に従って料理メニューを並び替えます。

【Output】  
レスポンスはJSON形式で提供され、並び替えられた料理項目が含まれます。各料理項目には以下の情報が含まれます：  
- `id`: 料理の一意の識別子。  
- `name`: 料理名。  
- `price`: 料理の価格。  
- `description`: 料理の説明（任意項目）。  
- `state`: 提供状態（available、limited、sold_out）。  
- `image_url`: 料理画像のURL（任意項目）。  

並び替え結果が存在しない場合、空のリストが返されます。

【Response Code】  
成功した場合、HTTPステータスコード200が返されます。クエリパラメータが欠落している場合、HTTPステータスコード400が返され、エラーメッセージが含まれます。データベース接続エラーが発生した場合、HTTPステータスコード500が返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "GET",
  "path": "/menu/sort",
  "headers": {
    "Content-Type": "application/json"
  },
  "query": {
    "sort_by": "price",
    "order": "asc"
  },
  "data": null
}
```

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": [
    {
      "id": 1,
      "name": "パスタ",
      "price": 1200,
      "description": "トマトソースのパスタ",
      "state": "available",
      "image_url": "https://example.com/images/pasta.jpg"
    },
    {
      "id": 2,
      "name": "ステーキ",
      "price": 2500,
      "description": "ジューシーなビーフステーキ",
      "state": "limited",
      "image_url": "https://example.com/images/steak.jpg"
    }
  ]
}
```

レスポンス（クエリ欠落時）:  
```json
{
  "status_code": 400,
  "error": {
    "message": "並び替え基準または順序が指定されていません。",
    "code": "MISSING_QUERY_PARAMETER"
  }
}
```

レスポンス（データベースエラー時）:  
```json
{
  "status_code": 500,
  "error": {
    "message": "データベース接続エラーが発生しました。後ほど再試行してください。",
    "code": "DB_CONNECTION_ERROR"
  }
}
```

【URI】  
POST /auth/login  
このエンドポイントは、内部ユーザーが認証を行い、JWTトークンを取得するために使用されます。リクエストはメールアドレスとパスワードを含むフォームデータを送信します。認証が成功すると、システムはJWTトークンを生成し、レスポンスとして返します。このエンドポイントは、Web Adminアプリケーション専用であり、認証が必要ではありません。

【Application name】  
Auth Service  

【Function name】  
login_user  

【Input】  
このエンドポイントは、リクエストボディに以下のデータを含む必要があります：  
- **email**: ユーザーのメールアドレス。システム内で一意である必要があり、認証のために使用されます。  
- **password**: ユーザーのパスワード。bcryptでハッシュ化された値と照合されます。パスワードポリシー（8文字以上、大文字・小文字・数字・記号を含む）に従う必要があります。  

リクエストを受信すると、システムは以下の手順で処理を行います：  
1. メールアドレスが登録済みであるかを確認します。登録されていない場合、エラーを返します。  
2. パスワードが正しいかを検証します。誤っている場合、エラーを返します。  
3. 認証が成功した場合、JWTトークンを生成し、レスポンスとして返します。  

【Output】  
レスポンスはJSON形式で返され、以下の情報を含みます：  
- **token**: 認証済みユーザーのJWTトークン。このトークンは、API Backendへの後続リクエストで使用されます。  
- **expires_in**: トークンの有効期限（秒単位）。デフォルトでは1日（86400秒）です。  
- **user_id**: 認証されたユーザーの一意のID。  

【Response Code】  
- **200 OK**: 認証が成功し、JWTトークンが正常に生成された場合。  
- **400 Bad Request**: リクエストボディが不完全または無効な場合（例：メールアドレスまたはパスワードが欠落している）。  
- **401 Unauthorized**: メールアドレスが登録されていない、またはパスワードが正しくない場合。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合。  

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "POST",
  "path": "/auth/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "data": {
    "email": "user@example.com",
    "password": "SecureP@ssw0rd"
  }
}
```

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "user_id": "12345"
  }
}
```

レスポンス（失敗時）:  
```json
{
  "status_code": 401,
  "error": {
    "message": "メールアドレスまたはパスワードが正しくありません。",
    "code": "AUTH_INVALID_CREDENTIALS"
  }
}
```


【URI】  
GET /menu  
このエンドポイントは、料理情報のリストを取得するために使用されます。リクエストは認証済みの内部ユーザー（Admin、Waiter、Chef）によって行われ、料理名、価格、説明、状態、画像を含む料理情報をレスポンスとして返します。このエンドポイントは、Web Adminアプリケーション専用であり、認証が必要です。

【Application name】  
API Backend  

【Function name】  
get_menu_list  

【Input】  
このエンドポイントは、リクエストボディやクエリパラメータを必要としません。認証済みのJWTトークンがリクエストヘッダーに含まれている必要があります。システムは以下の手順で処理を行います：  
1. JWTトークンの有効性を検証します。無効な場合、エラーを返します。  
2. データベースからすべての料理情報を取得します。  
3. 取得した料理情報をJSON形式でレスポンスとして返します。  

【Output】  
レスポンスはJSON形式で返され、以下の情報を含みます：  
- **menu_items**: 料理情報のリスト。各料理項目には以下のフィールドが含まれます：  
  - **id**: 料理の一意のID。  
  - **name**: 料理名。  
  - **price**: 料理の価格。  
  - **description**: 料理の説明。  
  - **state**: 料理の提供状況（available、limited、sold_out）。  
  - **image_url**: 料理画像のURL。  

【Response Code】  
- **200 OK**: 料理情報が正常に取得された場合。  
- **401 Unauthorized**: JWTトークンが無効または欠落している場合。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合。  

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "GET",
  "path": "/menu",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": {
    "menu_items": [
      {
        "id": "1",
        "name": "Spaghetti Carbonara",
        "price": 1200,
        "description": "クリーミーなソースとベーコンのパスタ。",
        "state": "available",
        "image_url": "https://example.com/images/spaghetti.jpg"
      },
      {
        "id": "2",
        "name": "Caesar Salad",
        "price": 800,
        "description": "新鮮な野菜と特製ドレッシング。",
        "state": "limited",
        "image_url": "https://example.com/images/salad.jpg"
      }
    ]
  }
}
```

レスポンス（失敗時）:  
```json
{
  "status_code": 401,
  "error": {
    "message": "認証が必要です。",
    "code": "AUTH_REQUIRED"
  }
}
```


【URI】  
POST /menu  
このエンドポイントは、新しい料理情報を作成するために使用されます。リクエストは認証済みの内部ユーザー（AdminまたはChef）によって行われ、料理名、価格、説明、画像、状態を含むデータを送信します。このエンドポイントは、Web Adminアプリケーション専用であり、認証が必要です。

【Application name】  
API Backend  

【Function name】  
create_menu_item  

【Input】  
このエンドポイントは、リクエストボディに以下のデータを含む必要があります：  
- **name**: 料理名。必須項目であり、最大100文字まで入力可能です。  
- **price**: 料理の価格。必須項目であり、0円以上の数値である必要があります。  
- **description**: 料理の説明。任意項目であり、最大500文字まで入力可能です。  
- **image**: 料理画像。任意項目であり、JPGまたはPNG形式のファイル（最大5MB）をアップロードできます。  
- **state**: 料理の提供状況。必須項目であり、available、limited、sold_outのいずれかを指定します。  

リクエストを受信すると、システムは以下の手順で処理を行います：  
1. JWTトークンの有効性を検証します。無効な場合、エラーを返します。  
2. 入力データのバリデーションを行います。無効な場合、エラーを返します。  
3. データベースに新しい料理情報を保存します。  
4. 作成された料理情報をJSON形式でレスポンスとして返します。  

【Output】  
レスポンスはJSON形式で返され、以下の情報を含みます：  
- **id**: 作成された料理の一意のID。  
- **name**: 料理名。  
- **price**: 料理の価格。  
- **description**: 料理の説明。  
- **state**: 料理の提供状況。  
- **image_url**: アップロードされた画像のURL（画像が提供された場合）。  

【Response Code】  
- **201 Created**: 料理情報が正常に作成された場合。  
- **400 Bad Request**: 入力データが無効または欠落している場合。  
- **401 Unauthorized**: JWTトークンが無効または欠落している場合。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合。  

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "POST",
  "path": "/menu",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "Content-Type": "application/json"
  },
  "data": {
    "name": "Grilled Salmon",
    "price": 1500,
    "description": "新鮮なサーモンをグリルした料理。",
    "state": "available",
    "image": "File"
  }
}
```

レスポンス（成功時）:  
```json
{
  "status_code": 201,
  "data": {
    "id": "3",
    "name": "Grilled Salmon",
    "price": 1500,
    "description": "新鮮なサーモンをグリルした料理。",
    "state": "available",
    "image_url": "https://example.com/images/salmon.jpg"
  }
}
```

レスポンス（失敗時）:  
```json
{
  "status_code": 400,
  "error": {
    "message": "入力データが無効です。",
    "code": "INVALID_INPUT"
  }
}
```

【URI】  
PUT メソッドを使用し、エンドポイント `/menu/{id}` にリクエストを送信します。このエンドポイントは、特定の料理情報を更新するために使用されます。`{id}` はパスパラメータとして指定され、更新対象の料理を一意に識別するために利用されます。このエンドポイントは認証が必要であり、内部ユーザー（Admin、Waiter、Chef）のみがアクセス可能です。

【Application name】  
API Backend

【Function name】  
update_menu_item

【Input】  
リクエストは、料理情報を更新するために必要なデータを含む JSON ペイロードを受け取ります。入力データには以下の項目が含まれます：  
- `id`: 更新対象の料理を一意に識別するための ID。システム内で一意である必要があります。  
- `name`: 料理の名前。必須項目であり、最大 100 文字まで入力可能です。  
- `price`: 料理の価格。必須項目であり、0 円以上の数値である必要があります。  
- `description`: 料理の説明。任意項目であり、最大 500 文字まで入力可能です。  
- `image`: 料理の画像ファイル。任意項目であり、JPG または PNG 形式のファイルをアップロードできます。最大サイズは 5MB です。  
- `state`: 料理の提供状況を示す状態。必須項目であり、`available`、`limited`、`sold_out` のいずれかを指定します。  

リクエストヘッダーには、認証トークン（JWT）が含まれている必要があります。このトークンは、ユーザーの権限を検証するために使用されます。

【Output】  
レスポンスは、更新された料理情報を含む JSON オブジェクトを返します。レスポンスには以下のデータが含まれます：  
- `id`: 更新された料理の ID。  
- `name`: 更新後の料理名。  
- `price`: 更新後の価格。  
- `description`: 更新後の説明。  
- `image_url`: 更新後の画像の URL。  
- `state`: 更新後の提供状況。  

レスポンスは、更新が成功した場合に HTTP ステータスコード 200 を返します。

【Response Code】  
- **200 OK**: 更新が正常に完了した場合に返されます。  
- **400 Bad Request**: 入力データが不正（例: 必須項目が欠落、価格が負の値）である場合に返されます。  
- **401 Unauthorized**: 認証トークンが無効または欠落している場合に返されます。  
- **403 Forbidden**: ユーザーが必要な権限を持っていない場合に返されます。  
- **404 Not Found**: 指定された料理 ID が存在しない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。

【Example (JSON)】  
**Request:**  
```json
{
  "method": "PUT",
  "path": "/menu/12345",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "Content-Type": "application/json"
  },
  "data": {
    "name": "新しい料理名",
    "price": 1500,
    "description": "新しい説明文",
    "image": "File",
    "state": "available"
  }
}
```

**Response:**  
```json
{
  "status_code": 200,
  "data": {
    "id": "12345",
    "name": "新しい料理名",
    "price": 1500,
    "description": "新しい説明文",
    "image_url": "https://example.com/images/12345.png",
    "state": "available"
  }
}
```

---

【URI】  
DELETE メソッドを使用し、エンドポイント `/menu/{id}` にリクエストを送信します。このエンドポイントは、特定の料理情報を削除するために使用されます。`{id}` はパスパラメータとして指定され、削除対象の料理を一意に識別するために利用されます。このエンドポイントは認証が必要であり、内部ユーザー（Admin のみ）がアクセス可能です。

【Application name】  
API Backend

【Function name】  
delete_menu_item

【Input】  
リクエストは、削除対象の料理を識別するための ID をパスパラメータとして受け取ります。リクエストヘッダーには、認証トークン（JWT）が含まれている必要があります。このトークンは、ユーザーの権限を検証するために使用されます。

【Output】  
レスポンスは、削除操作の結果を示す JSON オブジェクトを返します。レスポンスには以下のデータが含まれます：  
- `message`: 削除が成功したことを示すメッセージ。  
- `deleted_id`: 削除された料理の ID。  

レスポンスは、削除が成功した場合に HTTP ステータスコード 200 を返します。

【Response Code】  
- **200 OK**: 削除が正常に完了した場合に返されます。  
- **401 Unauthorized**: 認証トークンが無効または欠落している場合に返されます。  
- **403 Forbidden**: ユーザーが必要な権限を持っていない場合に返されます。  
- **404 Not Found**: 指定された料理 ID が存在しない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。

【Example (JSON)】  
**Request:**  
```json
{
  "method": "DELETE",
  "path": "/menu/12345",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response:**  
```json
{
  "status_code": 200,
  "data": {
    "message": "料理情報が正常に削除されました。",
    "deleted_id": "12345"
  }
}
```

---

【URI】  
PATCH メソッドを使用し、エンドポイント `/menu/state` にリクエストを送信します。このエンドポイントは、複数の料理の提供状況を一括で更新するために使用されます。このエンドポイントは認証が必要であり、内部ユーザー（Admin、Chef のみ）がアクセス可能です。

【Application name】  
API Backend

【Function name】  
bulk_update_menu_state

【Input】  
リクエストは、更新対象の料理 ID のリストと新しい状態を JSON ペイロードとして受け取ります。入力データには以下の項目が含まれます：  
- `ids`: 更新対象の料理 ID の配列。各 ID はシステム内で一意である必要があります。  
- `state`: 新しい提供状況。`available`、`limited`、`sold_out` のいずれかを指定します。  

リクエストヘッダーには、認証トークン（JWT）が含まれている必要があります。このトークンは、ユーザーの権限を検証するために使用されます。

【Output】  
レスポンスは、更新操作の結果を示す JSON オブジェクトを返します。レスポンスには以下のデータが含まれます：  
- `updated_ids`: 更新が成功した料理 ID の配列。  
- `state`: 更新後の提供状況。  

レスポンスは、更新が成功した場合に HTTP ステータスコード 200 を返します。

【Response Code】  
- **200 OK**: 更新が正常に完了した場合に返されます。  
- **400 Bad Request**: 入力データが不正（例: 必須項目が欠落、無効な状態値）である場合に返されます。  
- **401 Unauthorized**: 認証トークンが無効または欠落している場合に返されます。  
- **403 Forbidden**: ユーザーが必要な権限を持っていない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。

【Example (JSON)】  
**Request:**  
```json
{
  "method": "PATCH",
  "path": "/menu/state",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "Content-Type": "application/json"
  },
  "data": {
    "ids": ["12345", "67890"],
    "state": "sold_out"
  }
}
```

**Response:**  
```json
{
  "status_code": 200,
  "data": {
    "updated_ids": ["12345", "67890"],
    "state": "sold_out"
  }
}
```

【URI】  
GET /users  
このエンドポイントは、Web Adminアプリケーションから内部ユーザーの一覧を取得するために使用されます。リクエストは認証済みの内部ユーザー（Admin、Waiter、Chef）によってのみ実行可能です。パスパラメータは不要で、クエリパラメータも使用されません。

【Application name】  
API Backend  

【Function name】  
get_user_list  

【Input】  
このエンドポイントは、認証済みのリクエストを受け取ります。リクエストヘッダーには、JWTトークンが含まれている必要があります。このトークンは、Auth Serviceによって発行され、API Backendで検証されます。トークンが無効または期限切れの場合、リクエストは拒否されます。入力データは不要であり、リクエストは単純なGETメソッドで実行されます。

【Output】  
レスポンスは、システム内のすべての内部ユーザーのリストをJSON形式で返します。各ユーザーには以下の情報が含まれます：  
- ユーザーID（システム内で一意）  
- 氏名  
- メールアドレス  
- 割り当てられた役割（Admin、Waiter、Chef、またはカスタム役割）  
- 権限の詳細（各役割に関連付けられた権限の一覧）  

レスポンスはデータベースから取得された情報を基に構成され、役割や権限の情報はRBACモデルに基づいて整理されます。

【Response Code】  
成功した場合、HTTPステータスコード200が返されます。  
認証に失敗した場合、HTTPステータスコード401が返されます。この場合、レスポンスには「認証エラー」のメッセージが含まれます。  
権限が不足している場合、HTTPステータスコード403が返されます。この場合、レスポンスには「アクセス権がありません」のメッセージが含まれます。  
サーバー内部でエラーが発生した場合、HTTPステータスコード500が返されます。この場合、レスポンスには「サーバーエラー」のメッセージが含まれます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "GET",
  "path": "/users",
  "headers": {
    "Authorization": "Bearer <JWTトークン>"
  },
  "query": null,
  "data": null
}
```

成功時のレスポンス:  
```json
{
  "status_code": 200,
  "data": [
    {
      "user_id": "user123",
      "name": "山田太郎",
      "email": "taro.yamada@example.com",
      "roles": ["Admin"],
      "permissions": ["menu_view", "menu_edit", "user_create", "user_edit"]
    },
    {
      "user_id": "user456",
      "name": "佐藤花子",
      "email": "hanako.sato@example.com",
      "roles": ["Waiter"],
      "permissions": ["menu_view", "menu_description_edit"]
    }
  ]
}
```

認証失敗時のレスポンス:  
```json
{
  "status_code": 401,
  "error": "Unauthorized",
  "message": "認証に失敗しました。再度ログインしてください。"
}
```

権限不足時のレスポンス:  
```json
{
  "status_code": 403,
  "error": "Forbidden",
  "message": "この操作を実行する権限がありません。"
}
```

サーバーエラー時のレスポンス:  
```json
{
  "status_code": 500,
  "error": "Internal Server Error",
  "message": "サーバー内部でエラーが発生しました。管理者に連絡してください。"
}
```


【URI】  
POST /users  
このエンドポイントは、Web Adminアプリケーションから新しい内部ユーザーを作成するために使用されます。リクエストは認証済みのAdminユーザーによってのみ実行可能です。リクエストボディには、作成するユーザーの詳細情報が含まれます。

【Application name】  
API Backend  

【Function name】  
create_user  

【Input】  
リクエストはPOSTメソッドを使用し、以下のデータをJSON形式でリクエストボディに含めます：  
- `name`（必須）: 作成するユーザーの氏名。最大50文字。  
- `email`（必須）: 作成するユーザーのメールアドレス。有効な形式である必要があり、システム内で一意でなければなりません。  
- `password`（必須）: ユーザーのログインパスワード。ポリシーに従い、8文字以上で大文字・小文字・数字・記号を含む必要があります。  
- `roles`（必須）: ユーザーに割り当てる役割のリスト。役割は事前に定義されたもの（Admin、Waiter、Chef）またはカスタム役割から選択します。  

リクエストヘッダーには、JWTトークンが含まれている必要があります。このトークンは、Auth Serviceによって発行され、API Backendで検証されます。

【Output】  
レスポンスは、作成されたユーザーの詳細情報をJSON形式で返します。以下の情報が含まれます：  
- ユーザーID（システム内で一意）  
- 氏名  
- メールアドレス  
- 割り当てられた役割  
- 権限の詳細  

レスポンスはデータベースに新しいユーザーを登録した後に生成されます。

【Response Code】  
成功した場合、HTTPステータスコード201が返されます。  
入力データが不正または欠落している場合、HTTPステータスコード400が返されます。この場合、レスポンスには「入力エラー」のメッセージが含まれます。  
認証に失敗した場合、HTTPステータスコード401が返されます。  
権限が不足している場合、HTTPステータスコード403が返されます。  
サーバー内部でエラーが発生した場合、HTTPステータスコード500が返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "POST",
  "path": "/users",
  "headers": {
    "Authorization": "Bearer <JWTトークン>"
  },
  "data": {
    "name": "田中一郎",
    "email": "ichiro.tanaka@example.com",
    "password": "Password123!",
    "roles": ["Chef"]
  }
}
```

成功時のレスポンス:  
```json
{
  "status_code": 201,
  "data": {
    "user_id": "user789",
    "name": "田中一郎",
    "email": "ichiro.tanaka@example.com",
    "roles": ["Chef"],
    "permissions": ["menu_view", "menu_create", "menu_edit", "menu_delete"]
  }
}
```

入力エラー時のレスポンス:  
```json
{
  "status_code": 400,
  "error": "Bad Request",
  "message": "入力データが不正です。メールアドレスの形式を確認してください。"
}
```

認証失敗時のレスポンス:  
```json
{
  "status_code": 401,
  "error": "Unauthorized",
  "message": "認証に失敗しました。再度ログインしてください。"
}
```

権限不足時のレスポンス:  
```json
{
  "status_code": 403,
  "error": "Forbidden",
  "message": "この操作を実行する権限がありません。"
}
```

サーバーエラー時のレスポンス:  
```json
{
  "status_code": 500,
  "error": "Internal Server Error",
  "message": "サーバー内部でエラーが発生しました。管理者に連絡してください。"
}
```


【URI】  
PUT /users/{id}  
このエンドポイントは、Web Adminアプリケーションから既存の内部ユーザー情報を更新するために使用されます。リクエストは認証済みのAdminユーザーによってのみ実行可能です。パスパラメータとして更新対象のユーザーIDを指定します。

【Application name】  
API Backend  

【Function name】  
update_user  

【Input】  
リクエストはPUTメソッドを使用し、以下のデータをJSON形式でリクエストボディに含めます：  
- `id`（必須）: 更新対象のユーザーID。システム内で一意である必要があります。  
- `name`（任意）: 更新後の氏名。最大50文字。  
- `email`（任意）: 更新後のメールアドレス。有効な形式である必要があり、システム内で一意でなければなりません。  
- `roles`（任意）: 更新後に割り当てる役割のリスト。役割は事前に定義されたもの（Admin、Waiter、Chef）またはカスタム役割から選択します。  

リクエストヘッダーには、JWTトークンが含まれている必要があります。このトークンは、Auth Serviceによって発行され、API Backendで検証されます。

【Output】  
レスポンスは、更新されたユーザーの詳細情報をJSON形式で返します。以下の情報が含まれます：  
- ユーザーID（システム内で一意）  
- 更新後の氏名  
- 更新後のメールアドレス  
- 更新後の役割  
- 更新後の権限の詳細  

レスポンスはデータベースでユーザー情報を更新した後に生成されます。

【Response Code】  
成功した場合、HTTPステータスコード200が返されます。  
入力データが不正または欠落している場合、HTTPステータスコード400が返されます。  
認証に失敗した場合、HTTPステータスコード401が返されます。  
権限が不足している場合、HTTPステータスコード403が返されます。  
指定されたユーザーIDが存在しない場合、HTTPステータスコード404が返されます。  
サーバー内部でエラーが発生した場合、HTTPステータスコード500が返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "PUT",
  "path": "/users/user123",
  "headers": {
    "Authorization": "Bearer <JWTトークン>"
  },
  "data": {
    "name": "山田次郎",
    "email": "jiro.yamada@example.com",
    "roles": ["Waiter"]
  }
}
```

成功時のレスポンス:  
```json
{
  "status_code": 200,
  "data": {
    "user_id": "user123",
    "name": "山田次郎",
    "email": "jiro.yamada@example.com",
    "roles": ["Waiter"],
    "permissions": ["menu_view", "menu_description_edit"]
  }
}
```

入力エラー時のレスポンス:  
```json
{
  "status_code": 400,
  "error": "Bad Request",
  "message": "入力データが不正です。メールアドレスの形式を確認してください。"
}
```

認証失敗時のレスポンス:  
```json
{
  "status_code": 401,
  "error": "Unauthorized",
  "message": "認証に失敗しました。再度ログインしてください。"
}
```

権限不足時のレスポンス:  
```json
{
  "status_code": 403,
  "error": "Forbidden",
  "message": "この操作を実行する権限がありません。"
}
```

ユーザーIDが存在しない場合のレスポンス:  
```json
{
  "status_code": 404,
  "error": "Not Found",
  "message": "指定されたユーザーIDが存在しません。"
}
```

サーバーエラー時のレスポンス:  
```json
{
  "status_code": 500,
  "error": "Internal Server Error",
  "message": "サーバー内部でエラーが発生しました。管理者に連絡してください。"
}
```

【URI】  
DELETE メソッドを使用し、エンドポイント `/users/{id}` にリクエストを送信します。このエンドポイントは、特定のユーザーを削除するために使用されます。`{id}` はパスパラメータであり、削除対象のユーザーの一意の識別子を指定します。このエンドポイントは認証が必要であり、内部ユーザー（Admin 権限を持つユーザー）のみがアクセス可能です。

【Application name】  
API Backend

【Function name】  
delete_user

【Input】  
このエンドポイントは、リクエストパスに含まれる `id` パラメータを受け取ります。`id` は削除対象のユーザーを一意に識別するための値であり、システム内でユニークである必要があります。リクエストヘッダーには、認証済みの JWT トークンが含まれている必要があります。このトークンは、ユーザーの権限を検証するために使用されます。リクエストが送信されると、システムは以下の手順で処理を行います：  
1. JWT トークンを検証し、リクエストを送信したユーザーが適切な権限（Admin 権限）を持つことを確認します。  
2. `id` パラメータを使用して、データベース内の該当ユーザーを検索します。  
3. 該当ユーザーが存在する場合は削除処理を実行し、関連するデータを更新します。  

【Output】  
このエンドポイントのレスポンスは、削除操作の結果を示します。成功した場合、削除が完了したことを示す確認メッセージが JSON 形式で返されます。削除対象のユーザーが存在しない場合や、権限が不足している場合は、適切なエラーメッセージが返されます。

【Response Code】  
- **200 OK**: ユーザーの削除が正常に完了した場合に返されます。レスポンスには削除の成功を示すメッセージが含まれます。  
- **400 Bad Request**: `id` パラメータが無効な形式である場合に返されます。  
- **401 Unauthorized**: JWT トークンが無効、または提供されていない場合に返されます。  
- **403 Forbidden**: リクエストを送信したユーザーが必要な権限を持っていない場合に返されます。  
- **404 Not Found**: 指定された `id` に該当するユーザーが存在しない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "DELETE",
  "path": "/users/12345",
  "headers": {
    "Authorization": "Bearer <JWT_TOKEN>"
  }
}
```

成功時のレスポンス:  
```json
{
  "status": 200,
  "message": "User with ID 12345 has been successfully deleted."
}
```

エラー時のレスポンス例:  
```json
{
  "status": 404,
  "error": "User with ID 12345 not found."
}
```

---

【URI】  
GET メソッドを使用し、エンドポイント `/roles` にリクエストを送信します。このエンドポイントは、システム内で定義されているすべての役割とその権限の一覧を取得するために使用されます。このエンドポイントは認証が必要であり、内部ユーザー（Admin 権限を持つユーザー）のみがアクセス可能です。

【Application name】  
API Backend

【Function name】  
get_role_list

【Input】  
このエンドポイントは、特定の入力パラメータを必要としません。ただし、リクエストヘッダーには認証済みの JWT トークンが含まれている必要があります。このトークンは、リクエストを送信したユーザーの権限を検証するために使用されます。リクエストが送信されると、システムは以下の手順で処理を行います：  
1. JWT トークンを検証し、リクエストを送信したユーザーが適切な権限（Admin 権限）を持つことを確認します。  
2. データベースからすべての役割とその権限を取得します。  

【Output】  
このエンドポイントのレスポンスは、役割とその権限の一覧を含む JSON オブジェクトです。各役割には、役割名とその権限の詳細が含まれます。レスポンスは、データベースから取得された情報を基に構成されます。

【Response Code】  
- **200 OK**: 役割一覧の取得が正常に完了した場合に返されます。レスポンスには役割とその権限の詳細が含まれます。  
- **401 Unauthorized**: JWT トークンが無効、または提供されていない場合に返されます。  
- **403 Forbidden**: リクエストを送信したユーザーが必要な権限を持っていない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "GET",
  "path": "/roles",
  "headers": {
    "Authorization": "Bearer <JWT_TOKEN>"
  }
}
```

成功時のレスポンス:  
```json
{
  "status": 200,
  "roles": [
    {
      "name": "Admin",
      "permissions": ["menu_create", "menu_edit", "menu_delete", "user_manage"]
    },
    {
      "name": "Waiter",
      "permissions": ["menu_view", "menu_description_edit"]
    },
    {
      "name": "Chef",
      "permissions": ["menu_create", "menu_edit", "menu_delete"]
    }
  ]
}
```

エラー時のレスポンス例:  
```json
{
  "status": 403,
  "error": "Access denied. Admin privileges required."
}
```

---

【URI】  
POST メソッドを使用し、エンドポイント `/roles` にリクエストを送信します。このエンドポイントは、新しい役割を作成するために使用されます。リクエストボディには、作成する役割の名前と権限のリストを含める必要があります。このエンドポイントは認証が必要であり、内部ユーザー（Admin 権限を持つユーザー）のみがアクセス可能です。

【Application name】  
API Backend

【Function name】  
create_role

【Input】  
このエンドポイントは、リクエストボディに以下のパラメータを受け取ります：  
- `name`: 作成する役割の名前。役割名はシステム内で一意である必要があります。  
- `permissions`: 作成する役割に割り当てる権限のリスト。権限はシステム内で定義された固定的な一覧から選択します。  

リクエストヘッダーには認証済みの JWT トークンが含まれている必要があります。このトークンは、リクエストを送信したユーザーの権限を検証するために使用されます。リクエストが送信されると、システムは以下の手順で処理を行います：  
1. JWT トークンを検証し、リクエストを送信したユーザーが適切な権限（Admin 権限）を持つことを確認します。  
2. `name` パラメータが一意であることを確認します。  
3. データベースに新しい役割を作成し、指定された権限を割り当てます。  

【Output】  
このエンドポイントのレスポンスは、作成された役割の詳細を含む JSON オブジェクトです。レスポンスには役割名と割り当てられた権限のリストが含まれます。

【Response Code】  
- **201 Created**: 役割の作成が正常に完了した場合に返されます。レスポンスには作成された役割の詳細が含まれます。  
- **400 Bad Request**: リクエストボディが無効な形式である場合や、`name` パラメータが既に存在する場合に返されます。  
- **401 Unauthorized**: JWT トークンが無効、または提供されていない場合に返されます。  
- **403 Forbidden**: リクエストを送信したユーザーが必要な権限を持っていない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "POST",
  "path": "/roles",
  "headers": {
    "Authorization": "Bearer <JWT_TOKEN>"
  },
  "data": {
    "name": "Manager",
    "permissions": ["menu_view", "menu_edit", "user_manage"]
  }
}
```

成功時のレスポンス:  
```json
{
  "status": 201,
  "role": {
    "name": "Manager",
    "permissions": ["menu_view", "menu_edit", "user_manage"]
  }
}
```

エラー時のレスポンス例:  
```json
{
  "status": 400,
  "error": "Role name 'Manager' already exists."
}
```

【URI】  
PUT メソッドを使用し、`/roles/{id}` エンドポイントにリクエストを送信します。このエンドポイントは、既存の役割情報を更新するために使用されます。`{id}` はパスパラメータであり、更新対象の役割を一意に識別するために使用されます。このエンドポイントへのアクセスには認証が必要であり、内部ユーザー（Admin 権限を持つユーザー）のみが利用可能です。  

【Application name】  
API Backend  

【Function name】  
update_role  

【Input】  
このエンドポイントは、リクエストボディに JSON フォーマットで以下のパラメータを受け取ります：  
- `id`: 更新対象の役割を識別する一意の ID。パスパラメータとして提供されます。  
- `name`: 役割の新しい名前。最大 50 文字まで許容され、既存の役割名と重複してはなりません。  
- `permissions`: 更新後の権限リスト。権限は事前に定義された固定的な一覧から選択され、リスト形式で提供されます。各権限は、役割に割り当てる操作を表します。  

リクエストは、認証済みの JWT トークンを含む Authorization ヘッダーを必要とします。このトークンは、ユーザーの権限を検証するために使用されます。トークンが無効または期限切れの場合、リクエストは拒否されます。  

【Output】  
リクエストが成功した場合、更新された役割情報を含む JSON オブジェクトが返されます。このオブジェクトには以下の情報が含まれます：  
- `id`: 更新された役割の一意の ID。  
- `name`: 更新後の役割名。  
- `permissions`: 更新後の権限リスト。  

【Response Code】  
- **200 OK**: 役割が正常に更新された場合に返されます。  
- **400 Bad Request**: リクエストボディが不正（例：必須フィールドの欠落、無効なデータ形式）である場合に返されます。  
- **401 Unauthorized**: JWT トークンが無効または期限切れの場合に返されます。  
- **403 Forbidden**: リクエストを送信したユーザーが Admin 権限を持たない場合に返されます。  
- **404 Not Found**: 指定された `id` に対応する役割が存在しない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。  

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "PUT",
  "path": "/roles/123",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "Content-Type": "application/json"
  },
  "data": {
    "name": "Manager",
    "permissions": ["menu_view", "menu_edit", "staff_view"]
  }
}
```  

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": {
    "id": "123",
    "name": "Manager",
    "permissions": ["menu_view", "menu_edit", "staff_view"]
  }
}
```  

レスポンス（エラー時）:  
```json
{
  "status_code": 404,
  "error": {
    "message": "Role with ID 123 not found."
  }
}
```  


【URI】  
DELETE メソッドを使用し、`/roles/{id}` エンドポイントにリクエストを送信します。このエンドポイントは、既存の役割を削除するために使用されます。`{id}` は削除対象の役割を一意に識別するためのパスパラメータです。このエンドポイントへのアクセスには認証が必要であり、内部ユーザー（Admin 権限を持つユーザー）のみが利用可能です。  

【Application name】  
API Backend  

【Function name】  
delete_role  

【Input】  
このエンドポイントは、パスパラメータとして以下の情報を受け取ります：  
- `id`: 削除対象の役割を識別する一意の ID。  

リクエストには、認証済みの JWT トークンを含む Authorization ヘッダーが必要です。このトークンは、ユーザーの権限を検証するために使用されます。トークンが無効または期限切れの場合、リクエストは拒否されます。  

【Output】  
リクエストが成功した場合、削除が完了したことを示す確認メッセージが JSON オブジェクトとして返されます。このオブジェクトには以下の情報が含まれます：  
- `message`: 削除が成功したことを示すテキストメッセージ。  

【Response Code】  
- **200 OK**: 役割が正常に削除された場合に返されます。  
- **401 Unauthorized**: JWT トークンが無効または期限切れの場合に返されます。  
- **403 Forbidden**: リクエストを送信したユーザーが Admin 権限を持たない場合に返されます。  
- **404 Not Found**: 指定された `id` に対応する役割が存在しない場合に返されます。  
- **500 Internal Server Error**: サーバー内部で予期しないエラーが発生した場合に返されます。  

【Example (JSON)】  
リクエスト:  
```json
{
  "method": "DELETE",
  "path": "/roles/123",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```  

レスポンス（成功時）:  
```json
{
  "status_code": 200,
  "data": {
    "message": "Role with ID 123 has been successfully deleted."
  }
}
```  

レスポンス（エラー時）:  
```json
{
  "status_code": 404,
  "error": {
    "message": "Role with ID 123 not found."
  }
}
```
