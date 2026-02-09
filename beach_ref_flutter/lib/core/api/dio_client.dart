import 'package:dio/dio.dart';

/// Configured Dio instance for VIS API requests
class DioClient {
  DioClient._();

  static Dio? _instance;

  static const _baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  static const _timeout = Duration(seconds: 10);
  static const _appId = '2a9523517c52420da73d927c6d6bab23';

  static Dio get instance {
    _instance ??= _create();
    return _instance!;
  }

  static Dio _create() {
    final dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: _timeout,
      receiveTimeout: _timeout,
      sendTimeout: _timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FIVB-App-ID': _appId,
      },
      responseType: ResponseType.plain,
    ));

    return dio;
  }

  /// Add an interceptor (e.g. for logging)
  static void addInterceptor(Interceptor interceptor) {
    instance.interceptors.add(interceptor);
  }
}
