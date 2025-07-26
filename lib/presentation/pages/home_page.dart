import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/health_status_widget.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('BeachRef'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Health Status Widget at the top
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            child: const HealthStatusWidget(),
          ),
          // Main content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.sports_volleyball,
                    size: 80,
                    color: Color(0xFF1976D2),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Welcome to BeachRef',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Beach Volleyball Referee Assistant',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 48),
                  _buildQuickActions(context),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF003366),
          ),
        ),
        const SizedBox(height: 20),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 1.2,
          children: [
            _buildActionCard(
              context,
              icon: Icons.emoji_events,
              title: 'Tournaments',
              subtitle: 'View tournament listings',
              color: const Color(0xFFFF6600),
              onTap: () => context.go('/tournaments'),
            ),
            _buildActionCard(
              context,
              icon: Icons.schedule,
              title: 'Schedule',
              subtitle: 'Upcoming matches',
              color: const Color(0xFF003366),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
            _buildActionCard(
              context,
              icon: Icons.rule,
              title: 'Rules',
              subtitle: 'FIVB regulations',
              color: const Color(0xFF1976D2),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
            _buildActionCard(
              context,
              icon: Icons.settings,
              title: 'Settings',
              subtitle: 'App preferences',
              color: Colors.grey.shade600,
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Coming soon!')),
                );
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 32,
                color: color,
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}