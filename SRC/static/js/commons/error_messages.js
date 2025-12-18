export const PROJECT_MESSAGES = {
  COMMENT_REQUIRED: "コメントを入力してください。",
  COMMENT_MAX_LENGTH: "コメントは500文字以内で入力してください。",
  COMMENT_POSTED: "コメントを投稿しました。",
  PROJECT_UPDATED: "プロジェクトを更新しました。",
  PROJECT_NAME_REQUIRED: "プロジェクト名を入力してください。",
  PROJECT_NAME_MIN_LENGTH: "プロジェクト名は1文字以上で入力してください。",
  PROJECT_NAME_MAX_LENGTH: "プロジェクト名は50文字以内で入力してください。",
  DESCRIPTION_MAX_LENGTH: "説明は500文字以内で入力してください。",
  FILE_UPLOADED: "ファイルをアップロードしました。",
  FILE_DELETE_TITLE: "ファイル削除",
  FILE_DELETE_CONFIRM: (count) =>
    `${count} 件のファイルが完全に削除されます。\n削除してもよろしいですか？`,
  FILE_DELETED: "ファイルを削除しました。",
  FILE_DELETE_ERROR: "ファイルの削除に失敗しました。",
  UPLOAD_FAILED: "アップロード中にエラーが発生しました。",
  SELECT_FILE_ERROR: "削除するファイルを選択してください。",
  NO_FILE_SELECTED: "ファイルを選択してください。",
  INVALID_FILE_TYPE:
    "Markdown (.md) または画像ファイル (.jpg, .jpeg, .png) のみアップロード可能です。",
  INVALID_FILE_NAME: "ファイル名に特殊文字が含まれています。",
  FILE_TOO_LARGE_IMAGE: "画像ファイルは12MB以下にしてください。",
  FILE_TOO_LARGE_MD: "Markdownファイルは15MB以下にしてください。",
  FILE_SIZE_TOO_LARGE: "ファイルサイズが大きすぎます。",
  BASIC_DESIGN_UPLOADED: "基本設計書をアップロードしました。",
  BASIC_DESIGN_DELETED: "基本設計書を削除しました。",
  SELECT_REQUIREMENT_FILE_TO_GENERATE:
    "生成する要件定義書ファイルを選択してください。",
  BASIC_DESIGN_GENERATE_TITLE: "基本設計書生成",
  BASIC_DESIGN_GENERATE_CONFIRM: (count) =>
    `${count} 件の要件定義書から基本設計書を生成しますか？`,
  BASIC_DESIGN_GENERATE_SUCCESS: "基本設計書を生成しました。",
  FAILED_BASIC_DESIGN: "基本設計書の生成に失敗しました。",
  GENERATE_COMPLETED: "生成が完了しました。",
  PROJECT_ID_NOT_FOUND: "プロジェクトIDが見つかりません。",
  USER_NOT_FOUND: "ユーザー情報が見つかりません。",
  COMMON_ERROR_MESSAGE: "エラーが発生しました。",
  FILE_DOWNLOADED: "ファイルをダウンロードしました",
  SOURCE_TAB_INIT_FAILED: "ソースコードタブの初期化に失敗しました。",
  SOURCE_DATA_LOAD_FAILED: "ソースコードデータの読み込みに失敗しました。",
  FOLDER_LOAD_FAILED: "フォルダの読み込みに失敗しました。",
  FILE_ID_REQUIRED: "ファイルIDを入力してください。",
  PROJECT_LANGUAGE_UNDETERMINED: "プロジェクトの言語を判別できません。",
  FILE_TYPE_UNDETERMINED: "ファイルの種類を判別できません。",
  SELECT_FILE_OR_FOLDER: "ファイルまたはフォルダを選択してください",
  FILE_ALREADY_DELETED: "選択したファイルはすでに削除されています。これ以上削除できません。"
};

export const ACCESS_MESSAGES = {
  GROUP_NAME_REQUIRED: "グループ名を入力してください。",
  GROUP_NAME_LENGTH: "グループ名は1〜50文字で入力してください。",
  GROUP_NAME_DUPLICATE: "このグループ名は既に使用されています。",
  GROUP_LOAD_FAILED: "グループの読み込みに失敗しました。",
  GROUP_DELETE_SUCCESS: "グループが正常に削除されました。",
  GROUP_DELETE_FAILED: "グループの削除に失敗しました。",
  USER_NAME_REQUIRED: "メールアドレスを入力してください。",
  USER_EMAIL_INVALID: "有効なメールアドレスを入力してください。",
  USER_ADD_SUCCESS: "ユーザーへの権限付与が正常に完了しました。",
  USER_ALREADY_EXISTS: "ユーザー名は既に存在しています。",
  USER_DELETE_CONFIRM: (email) =>
    `メールアドレス「${email}」のユーザーを削除しますか？`,
  USER_DELETE_SUCCESS: "削除が完了しました。",
  USER_DELETE_FAILED: "ユーザーの削除に失敗しました。",
  USER_DELETE_IN_PROGRESS: "ユーザー削除機能は実装中です。",
};

export const HTTP_MESSAGES = {
  400: "リクエスト内容に誤りがあります。もう一度ご確認ください。",
  401: "セッションの有効期限が切れたか、認証に失敗しました。再度ログインしてください。",
  403: "この操作を行う権限がありません。",
  404: "リソースが存在しません。",
  405: "許可されていないメソッドです。",
  409: "データが他の操作と競合しています。再度お試しください。",
  413: "リクエストまたはファイルアップロードの容量が許可された上限を超えています。",
  500: "サーバーでエラーが発生しました。しばらくしてからもう一度お試しください。",
  502: "通信中に問題が発生しました。再度お試しください。",
  503: "現在サービスを利用できません。しばらくしてからもう一度お試しください。",
  504: "処理がタイムアウトしました。通信環境をご確認のうえ、再度お試しください。",
};

export const AUTH_ERROR = {
  AUTH_MESSAGE: "ログアウトしました。再度ログインしてください。",
};

export const CREATE_PROJECT_MESSAGES = {
  INIT_ERROR: "アプリケーションの初期化に失敗しました。",
  LOAD_USERS_ERROR: "ユーザーの取得に失敗しました。",
  CREATE_SUCCESS: "プロジェクトが正常に作成されました。",
  CREATE_ERROR: "プロジェクトの作成中にエラーが発生しました。",
  CANCEL_CONFIRM_TITLE: "操作の取り消し確認",
  CANCEL_CONFIRM_MESSAGE:
    "プロジェクトの作成／更新を取り消してもよろしいですか？\n保存されていない変更は失われます。",
  BASE_SPEC_CHANGE_TITLE: "起点を変更しますか？",
  BASE_SPEC_CHANGE_MESSAGE:
    "起点を変更すると登録済みのファイルが削除されます。\nよろしいですか？",
  // VALIDATION_ERROR: "入力内容を確認してください。",
  // REQUIRED_FIELD: "必須項目です。",
  INVALID_DIRECTORY_NAME:
    "ディレクトリ名が無効です。a-z, A-Z, 0-9, -, _, . のみ使用可能で、1〜100文字で入力してください。",
  DIRECTORY_START_END_DOT:
    "ディレクトリ名は . で始まったり終わったりできません。",
  DIRECTORY_NO_WHITESPACE: "ディレクトリ名に空白を含めることはできません。",
  GIT_REPO_REQUIRED: "Gitリポジトリは必須です。",
  GIT_USER_REQUIRED: "Gitユーザー名は必須です。",
  GIT_TOKEN_REQUIRED: "Gitトークン／パスワードは必須です。",
  GIT_TOKEN_MAX_LENGTH:
    "Gitトークン／パスワードは255文字以内で入力してください。",
  PROGRAMMING_LANGUAGE_REQUIRED: "プログラミング言語は必須です。",
  FRAMEWORK_TEST_REQUIRED: "テストフレームワークは必須です。",
  UPLOAD_FILE_REQUIRED:
    "ファイルをアップロードしてください（要件定義書または基本設計書を選択した場合）。",
  PAT_REQUIRED: "PATを入力してください。",
  ENTER_CREDENTIALS: "ユーザー名とパスワードを入力してください。",
  INVALID_GIT_URL: "GitのURLが無効です。",
  BRANCH_NAME_MAX: "ブランチ名は255文字以内で入力してください",
  PROJECT_NAME_REQUIRED: "プロジェクト名を入力してください。",
  PROJECT_LOAD_FAIL: "プロジェクトの読み込みに失敗しました",
  PROJECT_UPDATE_SUCCESS: "プロジェクトが正常に更新されました",
  ENTER_ALL_DIRECTORIES: "すべてのディレクトリを入力してください",
  CONFIRM_CANCEL_UPDATE_TITLE: "プロジェクト更新の取り消し確認",
  CONFIRM_CANCEL_UPDATE_MESSAGE: "プロジェクトの更新を取り消してもよろしいですか？ \n保存されていない変更は失われます。",
  DIRECTORY_CHANGE_TITLE: "ディレクトリ名の変更",
  DIRECTORY_CHANGE_MESSAGE:
    "フォルダ名を変更すると、同期のためにデータが自動的にPullされ、その後でなければPushできません。\n\n" +
    "そのため、データが上書きされてしまいます。名前を変更する前にデータをPullしておくことで、コンフリクトが発生した際にデータが失われるのを防ぐことができます。\n\n" +
    "以下のディレクトリ名を変更してもよろしいですか?",
};

export const PROJECT_ALERTS = {
  LOAD_LIST_ERROR: "プロジェクトの取得に失敗しました。",
  DELETE_SUCCESS: "プロジェクトが正常に削除されました。",
  DELETE_FAILURE: "プロジェクトの削除に失敗しました。もう一度お試しください。",
  GIT_PULL_FAILURE: "Git pull に失敗しました",
  DELETE_NO_TARGET: "削除対象がありません。",
  DELETE_TITLE: "プロジェクト削除",
  DELETE_MESSAGE: (count) => `${count} 件の項目が完全に削除されます。\n削除してもよろしいですか?`,
};

// User Management Alert / Error Messages
export const USER_MESSAGES = {
  LOAD_USERS_ERROR: "ユーザーの読み込みに失敗しました",
  CREATE_USER_SUCCESS: "ユーザーを作成しました。",
  CREATE_USER_API_ERROR: "ユーザーの作成に失敗しました。",
  USERNAME_REQUIRED: "ユーザー名を入力してください。",
  USERNAME_MAX_LENGTH: (max) => `ユーザー名は${max}文字以内で入力してください。`,
  EMAIL_REQUIRED: "メールアドレスを入力してください。",
  EMAIL_INVALID: "メールの形式が正しくありません。",
  EMAIL_MAX_LENGTH: (max) => `メールアドレスは${max}文字以内で入力してください。`,
  PASSWORD_REQUIRED: "パスワードを入力してください。",
  PASSWORD_MIN_LENGTH: "パスワードは8文字以上で入力してください。",
  PASSWORD_MAX_LENGTH: (max) => `パスワードは${max}文字以内で入力してください。`,
  PASSWORD_CONFIRM_REQUIRED: "確認用パスワードを入力してください。",
  PASSWORD_CONFIRM_MISMATCH: "確認用パスワードが一致しません。",
};

export const LOGIN_MESSAGES = {
  LOGIN_SUCCESS: "ログインしました",
  LOGIN_FAILED: "ログインに失敗しました",
  PASSWORD_HASH_FAILED: "パスワードのハッシュ化に失敗しました",
  FORGOT_PASSWORD_INFO: "パスワードリセット機能は準備中です",
};

export const RD_MESSAGES = {
  // API Error Messages
  FILE_LOAD_FAILED: "ファイルの読み込みに失敗しました",
  FILE_SAVE_SUCCESS: "更新しました。",
  FILE_SAVE_FAILED: "ファイルの保存に失敗しました",
  PROJECT_LOAD_FAILED: "プロジェクトの読み込みに失敗しました",
  FILES_LIST_LOAD_FAILED: "ファイル一覧の読み込みに失敗しました",
  GIT_FILES_LOAD_FAILED: "Gitファイルの読み込みに失敗しました",
  RESTORE_SUCCESS: "ファイルを復元しました",
  RESTORE_FAILED: "ファイルの復元に失敗しました",
  RESTORE_NOT_ALLOWED: "削除予定のファイルのみ復元できます",
  PROJECT_ID_AND_FILE_ID_REQUIRED: "プロジェクトIDとファイルIDは必須です。",
  PROJECT_ID_REQUIRED: "プロジェクトIDは必須です",

  // Validation Messages
  INVALID_URL_PARAMETERS: "URLパラメータが無効です",
  PROJECT_ID_OR_FILE_ID_MISSING: "プロジェクトIDまたはファイルIDが不足しています",
  CODE_EDITOR_NOT_FOUND: "コードエディタが見つかりません",

  // Success Messages
  CODE_COPIED: "コードをクリップボードにコピーしました",
  CODE_COPY_FAILED: "コードのコピーに失敗しました",

  // Initialization Messages
  PAGE_INIT_FAILED: "ページの初期化に失敗しました",

  // Basic Design Generation Messages
  BASIC_DESIGN_GENERATE_TITLE: "基本設計書生成",
  BASIC_DESIGN_GENERATE_CONFIRM: "基本設計書を生成しますか？",
  BASIC_DESIGN_GENERATE_IN_PROGRESS: "基本設計書生成機能は実装中です",
  BASIC_DESIGN_GENERATE_FAILED: "基本設計書の生成に失敗しました",

  // Detail Design Generation Messages
  DETAIL_DESIGN_GENERATE_TITLE: "詳細設計書生成",
  DETAIL_DESIGN_GENERATE_CONFIRM: "詳細設計書を生成しますか？",
  DETAIL_DESIGN_GENERATE_IN_PROGRESS: "詳細設計書を生成中...",
  DETAIL_DESIGN_GENERATE_SUCCESS: "詳細設計書の生成が完了しました",
  DETAIL_DESIGN_GENERATE_FAILED: "詳細設計書の生成に失敗しました",

  // Default Values
  REPOSITORY_NAME: "リポジトリ名",
  BRANCH_NAME: "ブランチ名",
  FILE_NAME: "ファイル名",
  NO_PREVIEW_AVAILABLE: "プレビューが利用できません",

  // Unit Test Design Messages
  UNSAVED_CHANGES_TITLE: "未保存の変更があります",
  UNSAVED_CHANGES_MESSAGE: "変更を保存せずに移動しますか？",
  UNIT_TEST_CODE_GENERATE_TITLE: "単体試験コード生成",
  UNIT_TEST_CODE_GENERATE_CONFIRM: "単体試験コードを生成しますか？",
  UNIT_TEST_CODE_GENERATE_IN_PROGRESS: "単体試験コード生成中...",
  UNIT_TEST_CODE_GENERATE_FAILED: "単体試験コード生成に失敗しました",
  PROJECT_ID_NOT_FOUND: "プロジェクトIDが見つかりません",
  NO_PUSHABLE_FILES: "プッシュ可能なファイルが見つかりません",
  REPOSITORY_URL_NOT_FOUND: "リポジトリURLが見つかりません",
  GIT_PUSH_SUCCESS: "Git Pushが完了しました",
  GIT_PULL_SUCCESS: "Git Pullが完了しました",
  COMMON_ERROR: "エラーが発生しました",
  FILE_NOT_LOADED: "ファイルが読み込まれていません",
  UNKNOWN_FILE: "不明",
  DEFAULT_BRANCH_NAME: "ブランチ名",
  DEFAULT_DATE: "0000/00/00 00:00",
};

export const SRC_MESSAGES = {
  // API Error Messages
  FILE_LOAD_FAILED: "ファイルの読み込みに失敗しました",
  FILE_SAVE_SUCCESS: "ファイルを保存しました",
  FILE_SAVE_FAILED: "ファイルの保存に失敗しました",
  PROJECT_LOAD_FAILED: "プロジェクトの読み込みに失敗しました",
  FILES_LIST_LOAD_FAILED: "ファイル一覧の読み込みに失敗しました",
  GIT_FILES_LOAD_FAILED: "Gitファイルの読み込みに失敗しました",
  FILE_TREE_LOAD_FAILED: "ファイルツリーの読み込みに失敗しました",

  // Validation Messages
  INVALID_URL_PARAMETERS: "URLパラメータが無効です",
  PROJECT_ID_OR_FILE_ID_MISSING: "プロジェクトIDまたはファイルIDが不足しています",
  CODE_EDITOR_NOT_FOUND: "コードエディタが見つかりません",
  ISSUE_TITLE_OR_CONTENT_MISSING: "タイトルと説明を入力してください",

  // Success Messages
  CODE_COPIED: "コードをクリップボードにコピーしました",
  CODE_COPY_FAILED: "コードのコピーに失敗しました",
  PREVIEW_RELOADED: "プレビューを更新しました",
  PREVIEW_RELOAD_FAILED: "プレビューの更新に失敗しました",
  GIT_PUSH_SUCCESS: "プッシュが完了しました",
  GIT_PUSH_FAILED: "プッシュに失敗しました",
  GIT_PULL_SUCCESS: "プルが完了しました",
  GIT_PULL_FAILED: "プルに失敗しました",
  REPOSITORY_URL_NOT_FOUND: "リポジトリURLが見つかりません",
  ISSUE_CREATED: "Issueを作成しました",
  ISSUE_CREATE_FAILED: "Issueの作成に失敗しました",
  ISSUE_SUBMIT_SUCCESS: "Issueの送信が完了しました",
  ISSUE_SUBMIT_FAILED: "Issueの送信に失敗しました",

  // Generation Messages
  DETAIL_DESIGN_GENERATE_TITLE: "詳細設計書生成",
  DETAIL_DESIGN_GENERATE_CONFIRM: "詳細設計書を生成しますか？",
  DETAIL_DESIGN_GENERATE_SUCCESS: "詳細設計書を生成しました",
  DETAIL_DESIGN_GENERATE_FAILED: "詳細設計書の生成に失敗しました",
  UNIT_TEST_SPEC_GENERATE_TITLE: "単体試験仕様書生成",
  UNIT_TEST_SPEC_GENERATE_CONFIRM: "単体試験仕様書を生成しますか？",
  UNIT_TEST_SPEC_GENERATE_SUCCESS: "単体試験仕様書を生成しました",
  UNIT_TEST_SPEC_GENERATE_FAILED: "単体試験仕様書の生成に失敗しました",
  UNIT_TEST_CODE_GENERATE_TITLE: "単体試験コード生成",
  UNIT_TEST_CODE_GENERATE_CONFIRM: "単体試験コードを生成しますか？",
  UNIT_TEST_CODE_GENERATE_SUCCESS: "単体試験コードを生成しました",
  UNIT_TEST_CODE_GENERATE_FAILED: "単体試験コードの生成に失敗しました",

  // Git Actions
  GIT_PUSH_CONFIRM_TITLE: "Git Push",
  GIT_PUSH_CONFIRM_MESSAGE: "ファイルをGitにプッシュしますか？",
  GIT_PULL_CONFIRM_TITLE: "Git Pull",
  GIT_PULL_CONFIRM_MESSAGE: "最新の変更をプルしますか？",

  // Unsaved Changes
  UNSAVED_CHANGES_TITLE: "未保存の変更",
  UNSAVED_CHANGES_MESSAGE: "保存されていない変更があります。移動してもよろしいですか？",
  UNSAVED_CHANGES_BACK_MESSAGE: "保存されていない変更があります。戻ってもよろしいですか？",

  // Initialization Messages
  PAGE_INIT_FAILED: "ページの初期化に失敗しました",
  PAGE_LOAD_FAILED: "ページの読み込みに失敗しました",

  // Default Values
  REPOSITORY_NAME: "リポジトリ名",
  BRANCH_NAME: "ブランチ名",
  FILE_NAME: "ファイル名",
  NO_PREVIEW_AVAILABLE: "プレビューが利用できません",
  NO_FILES_AVAILABLE: "ファイルがありません",
  MSG_UTD_EMPTY: "決定表とテストサンプルがありません",
};

export const GIT_MESSAGES_COMFIRM = {
  BRANCH_CHANGE_CONFIRM_TITLE: "未保存の変更があります",
  BRANCH_CHANGE_CONFIRM_MESSAGE:
    "ブランチを変更すると、Gitに保存されていないファイルは削除され、元に戻すことはできません。ブランチを変更してもよろしいですか?",
};

export const GIT_ERROR_MESSAGES = [
  "Gitの認証に失敗しました",                    // GIT_AUTHENTICATION_FAILED
  "指定したリポジトリまたはブランチが存在しません",   // GIT_REPOSITORY_OR_BRANCH_NOT_FOUND
  "このリポジトリへのアクセス権限がありません",       // GIT_REPOSITORY_ACCESS_DENIED
  "URLが不正です"                               // GIT_INVALID_URL
];