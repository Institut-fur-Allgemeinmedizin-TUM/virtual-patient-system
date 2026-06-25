/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** CaseItemModel */
export interface CaseItemModel {
  /** Id */
  id: string;
  /** Title */
  title: string;
  /** Language */
  language: string;
  /** Patient Name */
  patient_name: string;
  /** Patient Age */
  patient_age: number;
  /** Patient Occupation */
  patient_occupation: string;
}

/** ChatRequest */
export interface ChatRequest {
  /** Session Id */
  session_id: string;
  /** Message */
  message: string;
}

/** ChatResponse */
export interface ChatResponse {
  /** Reply */
  reply: string;
  /** Session Id */
  session_id: string;
}

/** CreateSessionRequest */
export interface CreateSessionRequest {
  /** Case Id */
  case_id: string;
}

/** CreateSessionResponse */
export interface CreateSessionResponse {
  /** Session Id */
  session_id: string;
  /** Case Id */
  case_id: string;
}

/** DiagnosisUpdate */
export interface DiagnosisUpdate {
  /** Diagnosis */
  diagnosis: string;
}

/** DiagnosticGroup */
export interface DiagnosticGroup {
  /** Name */
  name: string;
  /** Display Name */
  display_name: string;
  /** Data */
  data?: DiagnosticValue[] | null;
}

/** DiagnosticValue */
export interface DiagnosticValue {
  /** Name */
  name: string;
  /** Display Name */
  display_name: string;
  /** Unit */
  unit: string;
  /** Data Type */
  data_type: string;
  /** Data */
  data: any;
}

/** EvaluationCriterion */
export interface EvaluationCriterion {
  /** Name */
  name: string;
  /** Score */
  score: number;
  /** Explanation */
  explanation: string;
}

/** EvaluationResponse */
export interface EvaluationResponse {
  /** Id */
  id: number;
  /** Session Id */
  session_id: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Criteria */
  criteria: EvaluationCriterion[];
  /** Improvement Suggestions */
  improvement_suggestions: string[];
}

/** ExportResponse */
export interface ExportResponse {
  /** Sessions */
  sessions: SessionSummary[];
  /** Total Sessions */
  total_sessions: number;
  /** Date Range */
  date_range: string;
}

/** GetCasesResponse */
export interface GetCasesResponse {
  /** Cases */
  cases: CaseItemModel[];
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** MedicalBackgroundsAvailableResponse */
export interface MedicalBackgroundsAvailableResponse {
  /** Diagnostics Available */
  diagnostics_available: DiagnosticGroup[];
}

/** SessionMessageItem */
export interface SessionMessageItem {
  /** Id */
  id: number;
  /** Role */
  role: string;
  /** Content */
  content: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /** Tokens In */
  tokens_in: number | null;
  /** Tokens Out */
  tokens_out: number | null;
}

/** SessionMessagesResponse */
export interface SessionMessagesResponse {
  /** Session Id */
  session_id: string;
  /** Case Id */
  case_id: string;
  /**
   * Started At
   * @format date-time
   */
  started_at: string;
  /** Ended At */
  ended_at: string | null;
  /** Messages */
  messages: SessionMessageItem[];
}

/** SessionSummary */
export interface SessionSummary {
  /** Session Id */
  session_id: string;
  /** Case Id */
  case_id: string;
  /** User Id */
  user_id: string | null;
  /**
   * Started At
   * @format date-time
   */
  started_at: string;
  /** Ended At */
  ended_at: string | null;
  /** Message Count */
  message_count: number;
  /** Total Tokens In */
  total_tokens_in: number | null;
  /** Total Tokens Out */
  total_tokens_out: number | null;
}

/** SessionSummaryData */
export interface SessionSummaryData {
  /** Sessionid */
  sessionId: string;
  /** Score */
  score: number;
}

/** SessionsSummaryResponse */
export interface SessionsSummaryResponse {
  /** Sessions */
  sessions: Record<string, SessionSummaryData>;
}

/** UsedDiagnosticsResponse */
export interface UsedDiagnosticsResponse {
  /** Diagnostics Used */
  diagnostics_used: string[];
}

/** UserProfileResponse */
export interface UserProfileResponse {
  /** Sub */
  sub: string;
  /** Tum Id */
  tum_id?: string | null;
  /** Pronouns */
  pronouns: string;
  /** Roles */
  roles: string[];
}

/** UserProfileUpdateRequest */
export interface UserProfileUpdateRequest {
  /** Pronouns */
  pronouns?: string | null;
}

/** VHBLoginRequest */
export interface VHBLoginRequest {
  /** Password */
  password: string;
}

/** VHBLoginResponse */
export interface VHBLoginResponse {
  /** Ok */
  ok: boolean;
  /** Token */
  token: string;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
  /** Input */
  input?: any;
  /** Context */
  ctx?: object;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title Virtual Patient Backend
 * @version 0.1.0
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  auth = {
    /**
     * No description
     *
     * @name AuthLoginAuthLoginGet
     * @summary Auth Login
     * @request GET:/auth/login
     */
    authLoginAuthLoginGet: (
      query?: {
        /** Redirect To */
        redirect_to?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, HTTPValidationError>({
        path: `/auth/login`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name AuthCallbackAuthCallbackGet
     * @summary Auth Callback
     * @request GET:/auth/callback
     */
    authCallbackAuthCallbackGet: (
      query?: {
        /** Code */
        code?: string | null;
        /** State */
        state?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, HTTPValidationError>({
        path: `/auth/callback`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Get current user information.
     *
     * @name AuthMeAuthMeGet
     * @summary Auth Me
     * @request GET:/auth/me
     */
    authMeAuthMeGet: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/auth/me`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name AuthLogoutAuthLogoutPost
     * @summary Auth Logout
     * @request POST:/auth/logout
     */
    authLogoutAuthLogoutPost: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/auth/logout`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Authenticate VHB users with a shared password.
     *
     * @name VhbLoginAuthVhbLoginPost
     * @summary Vhb Login
     * @request POST:/auth/vhb-login
     */
    vhbLoginAuthVhbLoginPost: (
      data: VHBLoginRequest,
      params: RequestParams = {},
    ) =>
      this.request<VHBLoginResponse, HTTPValidationError>({
        path: `/auth/vhb-login`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  api = {
    /**
     * No description
     *
     * @name CreateSessionApiSessionsPost
     * @summary Create Session
     * @request POST:/api/sessions
     */
    createSessionApiSessionsPost: (
      data: CreateSessionRequest,
      params: RequestParams = {},
    ) =>
      this.request<CreateSessionResponse, HTTPValidationError>({
        path: `/api/sessions`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name ChatApiChatPost
     * @summary Chat
     * @request POST:/api/chat
     */
    chatApiChatPost: (data: ChatRequest, params: RequestParams = {}) =>
      this.request<ChatResponse, HTTPValidationError>({
        path: `/api/chat`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get all messages for a specific session.
     *
     * @name GetSessionMessagesApiSessionsSessionIdMessagesGet
     * @summary Get Session Messages
     * @request GET:/api/sessions/{session_id}/messages
     */
    getSessionMessagesApiSessionsSessionIdMessagesGet: (
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<SessionMessagesResponse, HTTPValidationError>({
        path: `/api/sessions/${sessionId}/messages`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Evaluate anamnesis performance for a session.
     *
     * @name EvaluateSessionApiSessionsSessionIdEvaluatePost
     * @summary Evaluate Session
     * @request POST:/api/sessions/{session_id}/evaluate
     */
    evaluateSessionApiSessionsSessionIdEvaluatePost: (
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<EvaluationResponse, HTTPValidationError>({
        path: `/api/sessions/${sessionId}/evaluate`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Get a summary of the last sessions the user did per case.
     *
     * @name GetLastSessionSummaryApiSessionsSummaryGet
     * @summary Get Last Session Summary
     * @request GET:/api/sessions/summary
     */
    getLastSessionSummaryApiSessionsSummaryGet: (params: RequestParams = {}) =>
      this.request<SessionsSummaryResponse, any>({
        path: `/api/sessions/summary`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Set current diagnosis of student
     *
     * @name SetDiagnosisApiSessionsSessionIdDiagnosisPost
     * @summary Set Diagnosis
     * @request POST:/api/sessions/{session_id}/diagnosis
     */
    setDiagnosisApiSessionsSessionIdDiagnosisPost: (
      sessionId: string,
      data: DiagnosisUpdate,
      params: RequestParams = {},
    ) =>
      this.request<any, HTTPValidationError>({
        path: `/api/sessions/${sessionId}/diagnosis`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Export session data for analytics and evaluation.
     *
     * @name ExportSessionsApiExportGet
     * @summary Export Sessions
     * @request GET:/api/export
     */
    exportSessionsApiExportGet: (
      query?: {
        /**
         * Case Id
         * Filter by case ID
         */
        case_id?: string | null;
        /**
         * Days
         * Number of days to look back
         * @default 7
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ExportResponse, HTTPValidationError>({
        path: `/api/export`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Get case details including patient persona information.
     *
     * @name GetCaseDetailsApiCasesCaseIdGet
     * @summary Get Case Details
     * @request GET:/api/cases/{case_id}
     */
    getCaseDetailsApiCasesCaseIdGet: (
      caseId: string,
      params: RequestParams = {},
    ) =>
      this.request<any, HTTPValidationError>({
        path: `/api/cases/${caseId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Get case details including patient persona information.
     *
     * @name GetCasesApiCasesGet
     * @summary Get Cases
     * @request GET:/api/cases
     */
    getCasesApiCasesGet: (params: RequestParams = {}) =>
      this.request<GetCasesResponse, any>({
        path: `/api/cases`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Get basic analytics summary.
     *
     * @name GetAnalyticsSummaryApiAnalyticsSummaryGet
     * @summary Get Analytics Summary
     * @request GET:/api/analytics/summary
     */
    getAnalyticsSummaryApiAnalyticsSummaryGet: (
      query?: {
        /**
         * Days
         * Number of days to look back
         * @default 7
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, HTTPValidationError>({
        path: `/api/analytics/summary`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the current user's profile information.
     *
     * @name GetUserProfileApiUserProfileGet
     * @summary Get User Profile
     * @request GET:/api/user/profile
     */
    getUserProfileApiUserProfileGet: (params: RequestParams = {}) =>
      this.request<UserProfileResponse, any>({
        path: `/api/user/profile`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Update the current user's profile information.
     *
     * @name UpdateUserProfileApiUserProfilePut
     * @summary Update User Profile
     * @request PUT:/api/user/profile
     */
    updateUserProfileApiUserProfilePut: (
      data: UserProfileUpdateRequest,
      params: RequestParams = {},
    ) =>
      this.request<UserProfileResponse, HTTPValidationError>({
        path: `/api/user/profile`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetMedicalBackgroundAvailableApiDiagnosticsCaseIdAvailableGet
     * @summary Get Medical Background Available
     * @request GET:/api/diagnostics/{case_id}/available
     */
    getMedicalBackgroundAvailableApiDiagnosticsCaseIdAvailableGet: (
      caseId: string,
      params: RequestParams = {},
    ) =>
      this.request<MedicalBackgroundsAvailableResponse, HTTPValidationError>({
        path: `/api/diagnostics/${caseId}/available`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name GetMedicalBackgroundApiDiagnosticsCaseIdGet
     * @summary Get Medical Background
     * @request GET:/api/diagnostics/{case_id}
     */
    getMedicalBackgroundApiDiagnosticsCaseIdGet: (
      caseId: string,
      query?: {
        /**
         * Diagnostic
         * The specific diagnostic to retrieve. If not provided, returns list of available diagnostics for the case.
         */
        diagnostic?: string;
        /**
         * Session Id
         * The session ID for tracking diagnostic usage. Required when requesting specific diagnostic data.
         */
        session_id?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<DiagnosticGroup, HTTPValidationError>({
        path: `/api/diagnostics/${caseId}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Get diagnostics used in a specific session.
     *
     * @name GetUsedDiagnosticsApiSessionsSessionIdDiagnosticsGet
     * @summary Get Used Diagnostics
     * @request GET:/api/sessions/{session_id}/diagnostics
     */
    getUsedDiagnosticsApiSessionsSessionIdDiagnosticsGet: (
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<UsedDiagnosticsResponse, HTTPValidationError>({
        path: `/api/sessions/${sessionId}/diagnostics`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  health = {
    /**
     * No description
     *
     * @name HealthHealthGet
     * @summary Health
     * @request GET:/health
     */
    healthHealthGet: (params: RequestParams = {}) =>
      this.request<Record<string, any>, any>({
        path: `/health`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Debug endpoint to check OIDC configuration (sanitized).
     *
     * @name HealthOidcHealthOidcGet
     * @summary Health Oidc
     * @request GET:/health/oidc
     */
    healthOidcHealthOidcGet: (params: RequestParams = {}) =>
      this.request<Record<string, any>, any>({
        path: `/health/oidc`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Check database connectivity.
     *
     * @name HealthDbHealthDbGet
     * @summary Health Db
     * @request GET:/health/db
     */
    healthDbHealthDbGet: (params: RequestParams = {}) =>
      this.request<Record<string, any>, any>({
        path: `/health/db`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  faviconIco = {
    /**
     * No description
     *
     * @name ServeStaticFileFaviconIcoGet
     * @summary Serve Static File
     * @request GET:/favicon.ico
     */
    serveStaticFileFaviconIcoGet: (
      query?: {
        /**
         * File Name
         * @default "favicon.ico"
         */
        file_name?: any;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, HTTPValidationError>({
        path: `/favicon.ico`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
  fullPath = {
    /**
     * No description
     *
     * @name ServeSpaFullPathGet
     * @summary Serve Spa
     * @request GET:/{full_path}
     */
    serveSpaFullPathGet: (fullPath: string, params: RequestParams = {}) =>
      this.request<any, HTTPValidationError>({
        path: `/${fullPath}`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
