import 'axios'

declare module 'axios' {
  export interface AxiosInstance {
    // Calling the instance directly (api(config)) goes through the call signature,
    // not through request(). Orval's mutator uses that form, so it needs the same
    // unwrapped return type as the named methods below.
    <R = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<R>
    request<R = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<R>
    get<R = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
    delete<R = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
    head<R = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
    options<R = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
    post<R = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>
    ): Promise<R>
    put<R = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>
    patch<R = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>
    ): Promise<R>
    postForm<R = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>
    ): Promise<R>
    putForm<R = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>
    ): Promise<R>
    patchForm<R = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>
    ): Promise<R>
  }
}
