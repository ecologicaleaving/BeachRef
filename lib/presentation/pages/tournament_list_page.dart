import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/tournament_bloc.dart';
import '../widgets/tournament_card.dart';
import '../../data/models/tournament.dart';

class TournamentListPage extends StatefulWidget {
  const TournamentListPage({super.key});

  @override
  State<TournamentListPage> createState() => _TournamentListPageState();
}

class _TournamentListPageState extends State<TournamentListPage> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  String? _selectedStatus;
  String? _selectedCompetitionLevel;
  DateTime? _startDate;
  DateTime? _endDate;
  String _sortBy = 'startDate';
  bool _sortAscending = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    
    context.read<TournamentBloc>().add(const TournamentLoadRequested());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<TournamentBloc>().add(const TournamentPaginateRequested());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _onSearch(String query) {
    context.read<TournamentBloc>().add(
      TournamentSearchRequested(search: query.isEmpty ? null : query),
    );
  }

  void _onFilterChanged() {
    context.read<TournamentBloc>().add(
      TournamentFilterRequested(
        status: _selectedStatus,
        competitionLevel: _selectedCompetitionLevel,
        startDate: _startDate,
        endDate: _endDate,
      ),
    );
  }

  void _onSort(String sortBy) {
    final newSortAscending = _sortBy == sortBy ? !_sortAscending : true;
    setState(() {
      _sortBy = sortBy;
      _sortAscending = newSortAscending;
    });
    
    context.read<TournamentBloc>().add(
      TournamentSortRequested(
        sortBy: sortBy,
        sortAscending: newSortAscending,
      ),
    );
  }

  void _onRefresh() {
    context.read<TournamentBloc>().add(const TournamentRefreshRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tournaments'),
        backgroundColor: const Color(0xFF003366),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _onRefresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchAndFilters(),
          Expanded(
            child: BlocBuilder<TournamentBloc, TournamentState>(
              builder: (context, state) {
                if (state is TournamentInitial) {
                  return const Center(
                    child: Text('Welcome! Load tournaments to get started.'),
                  );
                } else if (state is TournamentLoading) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                } else if (state is TournamentEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.sports_volleyball,
                          size: 64,
                          color: Colors.grey,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          state.message,
                          style: Theme.of(context).textTheme.bodyLarge,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _onRefresh,
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  );
                } else if (state is TournamentError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 32),
                          child: Text(
                            state.message,
                            style: Theme.of(context).textTheme.bodyLarge,
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _onRefresh,
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  );
                } else if (state is TournamentLoaded) {
                  return _buildTournamentList(state);
                } else {
                  return const Center(
                    child: Text('Unknown state'),
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade300),
        ),
      ),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              hintText: 'Search tournaments...',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onSubmitted: _onSearch,
          ),
          const SizedBox(height: 12),
          _buildFilters(),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth > 600) {
          return Row(
            children: [
              Expanded(child: _buildStatusFilter()),
              const SizedBox(width: 8),
              Expanded(child: _buildCompetitionLevelFilter()),
              const SizedBox(width: 8),
              Expanded(child: _buildDateFilters()),
            ],
          );
        } else {
          return Column(
            children: [
              Row(
                children: [
                  Expanded(child: _buildStatusFilter()),
                  const SizedBox(width: 8),
                  Expanded(child: _buildCompetitionLevelFilter()),
                ],
              ),
              const SizedBox(height: 8),
              _buildDateFilters(),
            ],
          );
        }
      },
    );
  }

  Widget _buildStatusFilter() {
    return DropdownButtonFormField<String>(
      value: _selectedStatus,
      decoration: const InputDecoration(
        labelText: 'Status',
        border: OutlineInputBorder(),
        isDense: true,
      ),
      items: const [
        DropdownMenuItem(value: null, child: Text('All Status')),
        DropdownMenuItem(value: 'scheduled', child: Text('Scheduled')),
        DropdownMenuItem(value: 'active', child: Text('Active')),
        DropdownMenuItem(value: 'completed', child: Text('Completed')),
        DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
      ],
      onChanged: (value) {
        setState(() {
          _selectedStatus = value;
        });
        _onFilterChanged();
      },
    );
  }

  Widget _buildCompetitionLevelFilter() {
    return DropdownButtonFormField<String>(
      value: _selectedCompetitionLevel,
      decoration: const InputDecoration(
        labelText: 'Level',
        border: OutlineInputBorder(),
        isDense: true,
      ),
      items: const [
        DropdownMenuItem(value: null, child: Text('All Levels')),
        DropdownMenuItem(value: 'World Tour', child: Text('World Tour')),
        DropdownMenuItem(value: 'Continental', child: Text('Continental')),
        DropdownMenuItem(value: 'National', child: Text('National')),
        DropdownMenuItem(value: 'Regional', child: Text('Regional')),
      ],
      onChanged: (value) {
        setState(() {
          _selectedCompetitionLevel = value;
        });
        _onFilterChanged();
      },
    );
  }

  Widget _buildDateFilters() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: _startDate ?? DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2030),
              );
              if (date != null) {
                setState(() {
                  _startDate = date;
                });
                _onFilterChanged();
              }
            },
            icon: const Icon(Icons.calendar_today),
            label: Text(_startDate != null
                ? 'From: ${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'
                : 'Start Date'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: _endDate ?? DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2030),
              );
              if (date != null) {
                setState(() {
                  _endDate = date;
                });
                _onFilterChanged();
              }
            },
            icon: const Icon(Icons.calendar_today),
            label: Text(_endDate != null
                ? 'To: ${_endDate!.day}/${_endDate!.month}/${_endDate!.year}'
                : 'End Date'),
          ),
        ),
      ],
    );
  }

  Widget _buildTournamentList(TournamentLoaded state) {
    return RefreshIndicator(
      onRefresh: () async {
        _onRefresh();
      },
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth > 800) {
            return _buildTournamentTable(state);
          } else {
            return _buildTournamentCards(state);
          }
        },
      ),
    );
  }

  Widget _buildTournamentTable(TournamentLoaded state) {
    return SingleChildScrollView(
      controller: _scrollController,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: DataTable(
              sortColumnIndex: _getSortColumnIndex(),
              sortAscending: _sortAscending,
              columns: [
                DataColumn(
                  label: const Text('Name'),
                  onSort: (_, __) => _onSort('name'),
                ),
                DataColumn(
                  label: const Text('Location'),
                  onSort: (_, __) => _onSort('location'),
                ),
                DataColumn(
                  label: const Text('Start Date'),
                  onSort: (_, __) => _onSort('startDate'),
                ),
                DataColumn(
                  label: const Text('End Date'),
                  onSort: (_, __) => _onSort('endDate'),
                ),
                DataColumn(
                  label: const Text('Level'),
                  onSort: (_, __) => _onSort('competitionLevel'),
                ),
                DataColumn(
                  label: const Text('Status'),
                  onSort: (_, __) => _onSort('status'),
                ),
              ],
              rows: state.tournaments.map((tournament) {
                return DataRow(
                  cells: [
                    DataCell(Text(tournament.name)),
                    DataCell(Text(tournament.location)),
                    DataCell(Text(_formatDate(tournament.startDate))),
                    DataCell(Text(_formatDate(tournament.endDate))),
                    DataCell(Text(tournament.competitionLevel)),
                    DataCell(_buildStatusBadge(tournament.status)),
                  ],
                );
              }).toList(),
            ),
          ),
          if (state.isLoadingMore)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }

  Widget _buildTournamentCards(TournamentLoaded state) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: state.tournaments.length + (state.isLoadingMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= state.tournaments.length) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ),
          );
        }
        
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: TournamentCard(tournament: state.tournaments[index]),
        );
      },
    );
  }

  Widget _buildStatusBadge(TournamentStatus status) {
    Color backgroundColor;
    Color textColor;
    
    switch (status) {
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
        status.value.toUpperCase(),
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }

  int? _getSortColumnIndex() {
    switch (_sortBy) {
      case 'name':
        return 0;
      case 'location':
        return 1;
      case 'startDate':
        return 2;
      case 'endDate':
        return 3;
      case 'competitionLevel':
        return 4;
      case 'status':
        return 5;
      default:
        return null;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}