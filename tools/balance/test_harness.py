"""Regression checks for evidence isolation and interruption recovery."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from tools.balance import common as C, league, paired, run


class EvidenceTests(unittest.TestCase):
    def test_league_points_are_three_one_zero(self):
        self.assertEqual([C.points(2, 1), C.points(1, 1), C.points(0, 1)], [3, 1, 0])

    def test_smoke_never_certifies_season_gates(self):
        rep = dict(matches=30, draw=.25, home_win=.45, goals_pg=2.8,
                   champion_pts=90, p18_pts=35, max_club_top_share=.4,
                   mean_club_top_share=.3, top_scorer_goals=25, margin5plus=0)
        gates = league.league_gates([rep])
        self.assertTrue(all(g['pass'] is None for g in gates))

    def test_build_version_invalidates_both_counterfactual_arms(self):
        with patch.object(C, 'engine_digest', return_value='engine'), patch.object(C, 'harness_digest', return_value='harness'):
            with patch.object(C, 'build_digest', return_value='v1'):
                key = paired.arm_key('state', [], [1, 2])
            with patch.object(C, 'build_digest', return_value='v2'):
                self.assertNotEqual(key, paired.arm_key('state', [], [1, 2]))

    def test_resume_uses_individual_completed_futures(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(C, 'CACHE', Path(directory)):
            sid, path, commands, seeds = 'resume', 'unused', [], [11, 12]
            C.cache_put(paired.arm_key(sid, commands, [11]), [{'score': 11}])
            def fake_map(fn, jobs, **kw):
                self.assertEqual(jobs, [(path, commands, 12)])
                result = {'score': 12}
                kw['on_result'](0, result)
                return [result]
            with patch.object(C, 'run_map', side_effect=fake_map):
                self.assertEqual(paired.run_arms([(sid, path, commands, seeds)]), [[{'score': 11}, {'score': 12}]])

    def test_cpu_checkpoint_replays_exact_score_and_canonical_context(self):
        import json
        from tools.balance import states
        req = json.loads((C.ROOT / 'tools/balance/reference_request.json').read_text())
        opts = {'builds': {'HOME': {'system_id': 'gegenpress', 'control': 'cpu'},
                           'AWAY': {'system_id': 'counter_strike', 'control': 'cpu'}}}
        recorded = league.play_match(req, opts)
        prepared = recorded['request']
        self.assertTrue(prepared['_build_prepared'])
        with tempfile.TemporaryDirectory() as directory, patch.object(C, 'CACHE', Path(directory)):
            snapshots = states._snap(prepared, [(1800, 'HOME', 'checkpoint')])
            snapshot = snapshots[0]
            self.assertEqual(snapshot['score'], states._score_at(recorded['goals'], 1800))
            self.assertEqual(snapshot['ctx']['own_system'], 'gegenpress')
            self.assertEqual(snapshot['ctx']['opp_system'], 'counter_strike')
            self.assertEqual(league.play_match(prepared)['score'], recorded['score'])

    def test_double_week_trains_once_and_advances_both_lineups(self):
        import copy
        import json
        ref = json.loads((C.ROOT / 'tools/balance/reference_request.json').read_text())
        sides = {'H': ref['home_team'], 'A': ref['away_team']}
        sea = {'sides': {12: sides, 13: sides},
               'fixtures': [{'id': str(mw), 'mw': mw, 'home': 'H', 'away': 'A', 'seed': mw} for mw in (12, 13)],
               'calendar': [{'kind': 'camp', 'mws': []}] * 4 + [{'kind': 'double', 'mws': [12, 13]}]}
        captured = []
        def fake_matches(reqs, opts, **kwargs):
            captured.append(copy.deepcopy(opts[0]['builds']['HOME']))
            return [{'score': {'home': 0, 'away': 0}} for _ in reqs]
        state = {}
        options = lambda f: {'builds': {'HOME': {'system_id': 'gegenpress'}, 'AWAY': {'system_id': 'gegenpress'}}}
        with patch.object(league, 'simulate_matches', side_effect=fake_matches):
            league.sim_progressing_season(sea, options, 'test', state)
        self.assertEqual(captured[0]['trained_this_season'], captured[1]['trained_this_season'])
        self.assertEqual(captured[0]['tp'], captured[1]['tp'])
        self.assertGreater(state['builds']['H']['familiarity']['gegenpress'], captured[1]['familiarity']['gegenpress'])
        self.assertTrue(state['gains']['H'])

    def test_provenance_round_trips_scale_tuples(self):
        import json
        self.assertEqual(C.provenance(), json.loads(json.dumps(C.provenance())))

    def test_result_rejected_after_source_or_scale_change(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(run, 'RESULTS', Path(directory)):
            with patch.object(C, 'provenance', return_value={'version': 1}):
                run.save_result('result', {'value': 3})
                self.assertEqual(run.load_result('result'), {'value': 3})
            with patch.object(C, 'provenance', return_value={'version': 2}):
                self.assertIsNone(run.load_result('result'))

    def test_common_random_no_change_comparison_is_zero(self):
        arm = [{'score': {'HOME': 2, 'AWAY': 1}, 'win': {'xg': {'HOME': .5, 'AWAY': .2}}, 'xg_after': {'HOME': 1., 'AWAY': .4}}] * 4
        diff = paired.diff_stats(arm, arm, 'HOME')
        for key in ('dxg_for', 'dxg_against', 'dgoals', 'dpts', 'changed', 'dxg_net'):
            self.assertEqual(diff[key], 0.)


if __name__ == '__main__':
    unittest.main()
