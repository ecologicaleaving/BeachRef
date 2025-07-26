import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/tournament.dart';
import '../../domain/repositories/tournament_repository.dart';

part 'tournament_event.dart';
part 'tournament_state.dart';

class TournamentBloc extends Bloc<TournamentEvent, TournamentState> {
  final TournamentRepository _tournamentRepository;
  StreamSubscription? _tournamentSubscription;

  TournamentBloc({
    required TournamentRepository tournamentRepository,
  })  : _tournamentRepository = tournamentRepository,
        super(const TournamentInitial()) {
    on<TournamentLoadRequested>(_onLoadRequested);
    on<TournamentRefreshRequested>(_onRefreshRequested);
    on<TournamentSortRequested>(_onSortRequested);
    on<TournamentPaginateRequested>(_onPaginateRequested);
    on<TournamentSearchRequested>(_onSearchRequested);
    on<TournamentFilterRequested>(_onFilterRequested);
    on<TournamentSubscriptionUpdated>(_onSubscriptionUpdated);

    _tournamentSubscription = _tournamentRepository
        .watchTournaments()
        .listen((tournaments) {
      add(TournamentSubscriptionUpdated(tournaments));
    });
  }

  Future<void> _onLoadRequested(
    TournamentLoadRequested event,
    Emitter<TournamentState> emit,
  ) async {
    emit(const TournamentLoading());

    final result = await _tournamentRepository.getTournaments(
      search: event.search,
      status: event.status,
      competitionLevel: event.competitionLevel,
      startDate: event.startDate,
      endDate: event.endDate,
      page: event.page,
      pageSize: event.pageSize,
      sortBy: event.sortBy,
      sortAscending: event.sortAscending,
    );

    result.fold(
      (tournaments) {
        if (tournaments.isEmpty) {
          emit(const TournamentEmpty('No tournaments found'));
        } else {
          emit(TournamentLoaded(
            tournaments: tournaments,
            hasReachedMax: tournaments.length < event.pageSize,
            currentPage: event.page,
            pageSize: event.pageSize,
            search: event.search,
            status: event.status,
            competitionLevel: event.competitionLevel,
            startDate: event.startDate,
            endDate: event.endDate,
            sortBy: event.sortBy,
            sortAscending: event.sortAscending,
          ));
        }
      },
      (error) {
        emit(TournamentError(_getUserFriendlyErrorMessage(error)));
      },
    );
  }

  Future<void> _onRefreshRequested(
    TournamentRefreshRequested event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    
    if (currentState is TournamentLoaded) {
      emit(currentState.copyWith(isRefreshing: true));
    } else {
      emit(const TournamentLoading());
    }

    final refreshResult = await _tournamentRepository.refreshTournaments();
    
    if (refreshResult.isError) {
      emit(TournamentError(_getUserFriendlyErrorMessage(refreshResult.error)));
      return;
    }

    final result = await _tournamentRepository.getTournaments(
      search: currentState is TournamentLoaded ? currentState.search : null,
      status: currentState is TournamentLoaded ? currentState.status : null,
      competitionLevel: currentState is TournamentLoaded ? currentState.competitionLevel : null,
      startDate: currentState is TournamentLoaded ? currentState.startDate : null,
      endDate: currentState is TournamentLoaded ? currentState.endDate : null,
      page: currentState is TournamentLoaded ? currentState.currentPage : 1,
      pageSize: currentState is TournamentLoaded ? currentState.pageSize : 20,
      sortBy: currentState is TournamentLoaded ? currentState.sortBy : 'startDate',
      sortAscending: currentState is TournamentLoaded ? currentState.sortAscending : true,
    );

    result.fold(
      (tournaments) {
        if (tournaments.isEmpty) {
          emit(const TournamentEmpty('No tournaments found'));
        } else {
          emit(TournamentLoaded(
            tournaments: tournaments,
            hasReachedMax: tournaments.length < (currentState is TournamentLoaded ? currentState.pageSize : 20),
            currentPage: currentState is TournamentLoaded ? currentState.currentPage : 1,
            pageSize: currentState is TournamentLoaded ? currentState.pageSize : 20,
            search: currentState is TournamentLoaded ? currentState.search : null,
            status: currentState is TournamentLoaded ? currentState.status : null,
            competitionLevel: currentState is TournamentLoaded ? currentState.competitionLevel : null,
            startDate: currentState is TournamentLoaded ? currentState.startDate : null,
            endDate: currentState is TournamentLoaded ? currentState.endDate : null,
            sortBy: currentState is TournamentLoaded ? currentState.sortBy : 'startDate',
            sortAscending: currentState is TournamentLoaded ? currentState.sortAscending : true,
            isRefreshing: false,
          ));
        }
      },
      (error) {
        emit(TournamentError(_getUserFriendlyErrorMessage(error)));
      },
    );
  }

  Future<void> _onSortRequested(
    TournamentSortRequested event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    if (currentState is! TournamentLoaded) return;

    emit(const TournamentLoading());

    final result = await _tournamentRepository.getTournaments(
      search: currentState.search,
      status: currentState.status,
      competitionLevel: currentState.competitionLevel,
      startDate: currentState.startDate,
      endDate: currentState.endDate,
      page: 1,
      pageSize: currentState.pageSize,
      sortBy: event.sortBy,
      sortAscending: event.sortAscending,
    );

    result.fold(
      (tournaments) {
        if (tournaments.isEmpty) {
          emit(const TournamentEmpty('No tournaments found'));
        } else {
          emit(TournamentLoaded(
            tournaments: tournaments,
            hasReachedMax: tournaments.length < currentState.pageSize,
            currentPage: 1,
            pageSize: currentState.pageSize,
            search: currentState.search,
            status: currentState.status,
            competitionLevel: currentState.competitionLevel,
            startDate: currentState.startDate,
            endDate: currentState.endDate,
            sortBy: event.sortBy,
            sortAscending: event.sortAscending,
          ));
        }
      },
      (error) {
        emit(TournamentError(_getUserFriendlyErrorMessage(error)));
      },
    );
  }

  Future<void> _onPaginateRequested(
    TournamentPaginateRequested event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    if (currentState is! TournamentLoaded || currentState.hasReachedMax) return;

    emit(currentState.copyWith(isLoadingMore: true));

    final result = await _tournamentRepository.getTournaments(
      search: currentState.search,
      status: currentState.status,
      competitionLevel: currentState.competitionLevel,
      startDate: currentState.startDate,
      endDate: currentState.endDate,
      page: currentState.currentPage + 1,
      pageSize: currentState.pageSize,
      sortBy: currentState.sortBy,
      sortAscending: currentState.sortAscending,
    );

    result.fold(
      (newTournaments) {
        emit(currentState.copyWith(
          tournaments: [...currentState.tournaments, ...newTournaments],
          hasReachedMax: newTournaments.length < currentState.pageSize,
          currentPage: currentState.currentPage + 1,
          isLoadingMore: false,
        ));
      },
      (error) {
        emit(currentState.copyWith(isLoadingMore: false));
      },
    );
  }

  Future<void> _onSearchRequested(
    TournamentSearchRequested event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    
    emit(const TournamentLoading());

    final result = await _tournamentRepository.getTournaments(
      search: event.search,
      status: currentState is TournamentLoaded ? currentState.status : null,
      competitionLevel: currentState is TournamentLoaded ? currentState.competitionLevel : null,
      startDate: currentState is TournamentLoaded ? currentState.startDate : null,
      endDate: currentState is TournamentLoaded ? currentState.endDate : null,
      page: 1,
      pageSize: currentState is TournamentLoaded ? currentState.pageSize : 20,
      sortBy: currentState is TournamentLoaded ? currentState.sortBy : 'startDate',
      sortAscending: currentState is TournamentLoaded ? currentState.sortAscending : true,
    );

    result.fold(
      (tournaments) {
        if (tournaments.isEmpty) {
          emit(const TournamentEmpty('No tournaments found for search criteria'));
        } else {
          emit(TournamentLoaded(
            tournaments: tournaments,
            hasReachedMax: tournaments.length < (currentState is TournamentLoaded ? currentState.pageSize : 20),
            currentPage: 1,
            pageSize: currentState is TournamentLoaded ? currentState.pageSize : 20,
            search: event.search,
            status: currentState is TournamentLoaded ? currentState.status : null,
            competitionLevel: currentState is TournamentLoaded ? currentState.competitionLevel : null,
            startDate: currentState is TournamentLoaded ? currentState.startDate : null,
            endDate: currentState is TournamentLoaded ? currentState.endDate : null,
            sortBy: currentState is TournamentLoaded ? currentState.sortBy : 'startDate',
            sortAscending: currentState is TournamentLoaded ? currentState.sortAscending : true,
          ));
        }
      },
      (error) {
        emit(TournamentError(_getUserFriendlyErrorMessage(error)));
      },
    );
  }

  Future<void> _onFilterRequested(
    TournamentFilterRequested event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    
    emit(const TournamentLoading());

    final result = await _tournamentRepository.getTournaments(
      search: currentState is TournamentLoaded ? currentState.search : null,
      status: event.status,
      competitionLevel: event.competitionLevel,
      startDate: event.startDate,
      endDate: event.endDate,
      page: 1,
      pageSize: currentState is TournamentLoaded ? currentState.pageSize : 20,
      sortBy: currentState is TournamentLoaded ? currentState.sortBy : 'startDate',
      sortAscending: currentState is TournamentLoaded ? currentState.sortAscending : true,
    );

    result.fold(
      (tournaments) {
        if (tournaments.isEmpty) {
          emit(const TournamentEmpty('No tournaments found for filter criteria'));
        } else {
          emit(TournamentLoaded(
            tournaments: tournaments,
            hasReachedMax: tournaments.length < (currentState is TournamentLoaded ? currentState.pageSize : 20),
            currentPage: 1,
            pageSize: currentState is TournamentLoaded ? currentState.pageSize : 20,
            search: currentState is TournamentLoaded ? currentState.search : null,
            status: event.status,
            competitionLevel: event.competitionLevel,
            startDate: event.startDate,
            endDate: event.endDate,
            sortBy: currentState is TournamentLoaded ? currentState.sortBy : 'startDate',
            sortAscending: currentState is TournamentLoaded ? currentState.sortAscending : true,
          ));
        }
      },
      (error) {
        emit(TournamentError(_getUserFriendlyErrorMessage(error)));
      },
    );
  }

  void _onSubscriptionUpdated(
    TournamentSubscriptionUpdated event,
    Emitter<TournamentState> emit,
  ) {
    final currentState = state;
    if (currentState is TournamentLoaded && !currentState.isRefreshing) {
      emit(currentState.copyWith(tournaments: event.tournaments));
    }
  }

  String _getUserFriendlyErrorMessage(Exception error) {
    final errorMessage = error.toString().toLowerCase();
    
    if (errorMessage.contains('network') || errorMessage.contains('connection')) {
      return 'Please check your internet connection and try again.';
    } else if (errorMessage.contains('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (errorMessage.contains('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    } else if (errorMessage.contains('authentication') || errorMessage.contains('unauthorized')) {
      return 'Authentication failed. Please log in again.';
    } else if (errorMessage.contains('vis api')) {
      return 'Tournament service is temporarily unavailable. Please try again later.';
    } else {
      return 'Something went wrong. Please try again.';
    }
  }

  @override
  Future<void> close() {
    _tournamentSubscription?.cancel();
    return super.close();
  }
}