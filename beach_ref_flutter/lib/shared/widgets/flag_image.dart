import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Country flag image from FIVB country code
/// Uses FIVB flag images as primary source, flagcdn as fallback
class FlagImage extends StatelessWidget {
  final String countryCode;
  final double width;
  final double height;
  final double borderRadius;

  const FlagImage({
    super.key,
    required this.countryCode,
    this.width = 24,
    this.height = 16,
    this.borderRadius = 4,
  });

  @override
  Widget build(BuildContext context) {
    if (countryCode.isEmpty) {
      return SizedBox(width: width, height: height);
    }

    final code = countryCode.toUpperCase().trim();
    // Primary: FIVB flag images
    final fivbUrl = 'https://www.fivb.org/Vis2009/Images/Flags/Small/$code.png';
    // Fallback: flagcdn
    final fallbackUrl = 'https://flagcdn.com/w40/${_isoCode(code)}.png';

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: CachedNetworkImage(
        imageUrl: fivbUrl,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorWidget: (context, url, error) => CachedNetworkImage(
          imageUrl: fallbackUrl,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorWidget: (context, url, error) => Container(
            width: width,
            height: height,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(borderRadius),
            ),
            child: Text(
              code.length >= 2 ? code.substring(0, 2) : code,
              style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w600),
            ),
          ),
          placeholder: (context, url) => Container(
            width: width,
            height: height,
            color: Colors.grey.shade100,
          ),
        ),
        placeholder: (context, url) => Container(
          width: width,
          height: height,
          color: Colors.grey.shade100,
        ),
      ),
    );
  }

  /// Convert FIVB country code to ISO 3166-1 alpha-2 (lowercase)
  String _isoCode(String fivbCode) {
    const mapping = {
      'USA': 'us', 'BRA': 'br', 'GER': 'de', 'ITA': 'it', 'FRA': 'fr',
      'ESP': 'es', 'NED': 'nl', 'POL': 'pl', 'CAN': 'ca', 'AUS': 'au',
      'JPN': 'jp', 'CHN': 'cn', 'RUS': 'ru', 'ARG': 'ar', 'MEX': 'mx',
      'CUB': 'cu', 'TUR': 'tr', 'SRB': 'rs', 'CRO': 'hr', 'SUI': 'ch',
      'AUT': 'at', 'CZE': 'cz', 'SVK': 'sk', 'NOR': 'no', 'SWE': 'se',
      'DEN': 'dk', 'FIN': 'fi', 'GBR': 'gb', 'POR': 'pt', 'GRE': 'gr',
      'BEL': 'be', 'CHI': 'cl', 'COL': 'co', 'PER': 'pe', 'VEN': 've',
      'URU': 'uy', 'PAR': 'py', 'ECU': 'ec', 'BOL': 'bo', 'RSA': 'za',
      'EGY': 'eg', 'MAR': 'ma', 'TUN': 'tn', 'NGA': 'ng', 'KEN': 'ke',
      'IND': 'in', 'KOR': 'kr', 'THA': 'th', 'INA': 'id', 'PHI': 'ph',
      'VIE': 'vn', 'MAS': 'my', 'SIN': 'sg', 'NZL': 'nz', 'LAT': 'lv',
      'LTU': 'lt', 'EST': 'ee', 'UKR': 'ua', 'BLR': 'by', 'GEO': 'ge',
      'KAZ': 'kz', 'ISR': 'il', 'IRI': 'ir', 'QAT': 'qa', 'UAE': 'ae',
      'HUN': 'hu', 'ROU': 'ro', 'BUL': 'bg', 'SLO': 'si', 'IRL': 'ie',
    };

    if (mapping.containsKey(fivbCode)) return mapping[fivbCode]!;
    if (fivbCode.length >= 2) return fivbCode.substring(0, 2).toLowerCase();
    return fivbCode.toLowerCase();
  }
}
