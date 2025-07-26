import 'package:flutter/material.dart';

import '../../data/models/tournament.dart';

class TournamentCard extends StatelessWidget {
  final Tournament tournament;
  final VoidCallback? onTap;

  const TournamentCard({
    super.key,
    required this.tournament,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tournament.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(
                              Icons.location_on,
                              size: 16,
                              color: Colors.grey,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                tournament.location,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Colors.grey.shade600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _buildStatusBadge(context),
                ],
              ),
              const SizedBox(height: 12),
              _buildInfoRow(context),
              const SizedBox(height: 8),
              _buildDateRow(context),
              if (tournament.teams.isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildTeamsInfo(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    
    switch (tournament.status) {
      case TournamentStatus.scheduled:
        backgroundColor = Colors.blue.shade100;
        textColor = Colors.blue.shade800;
        break;
      case TournamentStatus.active:
        backgroundColor = Colors.green.shade100;
        textColor = Colors.green.shade800;
        break;
      case TournamentStatus.completed:
        backgroundColor = Colors.grey.shade100;
        textColor = Colors.grey.shade800;
        break;
      case TournamentStatus.cancelled:
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade800;
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        tournament.status.value.toUpperCase(),
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Row(
            children: [
              const Icon(
                Icons.emoji_events,
                size: 16,
                color: Color(0xFFFF6600),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  tournament.competitionLevel,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFFFF6600),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        if (tournament.tournamentType.isNotEmpty)
          Expanded(
            child: Row(
              children: [
                const Icon(
                  Icons.category,
                  size: 16,
                  color: Colors.grey,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    tournament.tournamentType,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildDateRow(BuildContext context) {
    return Row(
      children: [
        const Icon(
          Icons.schedule,
          size: 16,
          color: Colors.grey,
        ),
        const SizedBox(width: 4),
        Text(
          '${_formatDate(tournament.startDate)} - ${_formatDate(tournament.endDate)}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey.shade600,
          ),
        ),
        const Spacer(),
        if (_isUpcoming(tournament.startDate))
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'Upcoming',
              style: TextStyle(
                color: Colors.orange.shade800,
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildTeamsInfo(BuildContext context) {
    return Row(
      children: [
        const Icon(
          Icons.groups,
          size: 16,
          color: Colors.grey,
        ),
        const SizedBox(width: 4),
        Text(
          '${tournament.teams.length} teams participating',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  bool _isUpcoming(DateTime startDate) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tournamentStart = DateTime(startDate.year, startDate.month, startDate.day);
    
    return tournamentStart.isAfter(today) && 
           tournamentStart.difference(today).inDays <= 30;
  }
}