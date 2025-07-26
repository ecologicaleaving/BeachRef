part of 'tournament_bloc.dart';

@immutable
abstract class TournamentEvent {
  const TournamentEvent();
}

class TournamentLoadRequested extends TournamentEvent {
  final String? search;
  final String? status;
  final String? competitionLevel;
  final DateTime? startDate;
  final DateTime? endDate;
  final int page;
  final int pageSize;
  final String sortBy;
  final bool sortAscending;

  const TournamentLoadRequested({
    this.search,
    this.status,
    this.competitionLevel,
    this.startDate,
    this.endDate,
    this.page = 1,
    this.pageSize = 20,
    this.sortBy = 'startDate',
    this.sortAscending = true,
  });

}

class TournamentRefreshRequested extends TournamentEvent {
  const TournamentRefreshRequested();
}

class TournamentSortRequested extends TournamentEvent {
  final String sortBy;
  final bool sortAscending;

  const TournamentSortRequested({
    required this.sortBy,
    required this.sortAscending,
  });

}

class TournamentPaginateRequested extends TournamentEvent {
  const TournamentPaginateRequested();
}

class TournamentSearchRequested extends TournamentEvent {
  final String? search;

  const TournamentSearchRequested({
    this.search,
  });

}

class TournamentFilterRequested extends TournamentEvent {
  final String? status;
  final String? competitionLevel;
  final DateTime? startDate;
  final DateTime? endDate;

  const TournamentFilterRequested({
    this.status,
    this.competitionLevel,
    this.startDate,
    this.endDate,
  });

}

class TournamentSubscriptionUpdated extends TournamentEvent {
  final List<Tournament> tournaments;

  const TournamentSubscriptionUpdated(this.tournaments);
}