'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Download, Calendar, Play, Star, Quote, Heart, TrendingUp, Shield, Zap, Target, Users, DollarSign, Award } from 'lucide-react';

export default function DestinationMotivationLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className={`transition-all duration-300 ${scrolled ? 'h-8 w-8' : 'h-10 w-10'}`} viewBox="0 0 40 40" fill="none">
                <path d="M20 0L24.4721 15.5279L40 20L24.4721 24.4721L20 40L15.5279 24.4721L0 20L15.5279 15.5279L20 0Z" fill="#DC2626"/>
              </svg>
              <span className={`font-bold transition-all duration-300 ${scrolled ? 'text-gray-900 text-lg' : 'text-white text-xl'}`}>
                Power<span className="text-red-600">100</span>
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-red-600' : 'text-white hover:text-red-200'}`}>Features</a>
              <a href="#results" className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-red-600' : 'text-white hover:text-red-200'}`}>Results</a>
              <a href="#testimonials" className={`transition-colors ${scrolled ? 'text-gray-700 hover:text-red-600' : 'text-white hover:text-red-200'}`}>Testimonials</a>
              <button className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition-colors">Schedule Demo</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-900 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container mx-auto px-4 py-32 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-center items-center">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 flex items-center gap-2">
                <span className="text-yellow-400 text-sm">⭐</span>
                <span className="text-white text-sm font-medium">Top 1% of Strategic Partners</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <span className="text-white text-sm font-medium">500+ Verified Contractors Helped</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  Destination<span className="block text-yellow-400">Motivation</span>
                </h1>

                <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                  Transform your sales process with vacation vouchers that create emotional connections with customers.
                </p>

                <p className="text-lg text-white/80 mb-10">
                  Our proven system helps contractors boost close rates, overcome price objections, and differentiate from competitors.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button className="group bg-green-500 text-white px-8 py-4 rounded-full hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
                    <Calendar className="w-5 h-5" />
                    Schedule Introduction
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button className="bg-black/40 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-full hover:bg-black/60 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
                    <Download className="w-5 h-5" />
                    Download Report
                  </button>
                </div>

                <div className="mt-10 flex items-center gap-6 justify-center md:justify-start">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 border-2 border-white"></div>
                    ))}
                  </div>
                  <div className="text-white/90">
                    <p className="text-sm font-medium">Trusted by 500+ contractors</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (<span key={i} className="text-yellow-400">★</span>))}
                      <span className="ml-1 text-xs">(4.9/5.0)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center md:justify-end">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative bg-white rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-full mb-4">
                        <Star className="w-10 h-10 text-white" fill="currentColor" />
                      </div>

                      <p className="text-sm text-gray-600 uppercase tracking-wider mb-2 font-semibold">PowerExperience Rating</p>

                      <div className="text-8xl font-bold text-red-600 mb-2">99</div>

                      <p className="text-xl font-semibold text-gray-800">Elite Partner</p>

                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Performance Metrics</p>
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div>
                            <p className="text-2xl font-bold text-green-600">+12%</p>
                            <p className="text-xs text-gray-600">Avg Close Rate</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">-6.8%</p>
                            <p className="text-xs text-gray-600">Cancel Rate</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proven Results */}
      <section id="results" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">Proven Results</div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Real Results from Verified Contractors</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Through the Power100 Experience, contractors consistently achieve measurable improvements</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              { value: '+12%', label: 'Avg Closing Rate Increase', color: 'from-green-500 to-emerald-600' },
              { value: '-6.8%', label: 'Avg Cancel Rate Reduction', color: 'from-blue-500 to-cyan-600' },
              { value: '9.2/10', label: 'Customer Experience Score', color: 'from-purple-500 to-violet-600' },
              { value: '500+', label: 'Verified Contractors Helped', color: 'from-orange-500 to-red-600' },
            ].map((stat, index) => (
              <div key={index} className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl mb-4`}>
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className={`text-5xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>{stat.value}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{stat.label}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">How It Works</div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Emotional Connections That Close Deals</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {[
              { icon: Heart, title: 'Create Emotional Engagement', desc: 'Move beyond transactional sales with vacation vouchers', color: 'red' },
              { icon: TrendingUp, title: 'Boost Close Rates', desc: 'Increase close rates by an average of 12%', color: 'blue' },
              { icon: Shield, title: 'Overcome Price Objections', desc: 'Add unique value that competitors can\'t match', color: 'green' },
              { icon: Zap, title: 'Stand Out From Competition', desc: 'Be remembered for offering something truly special', color: 'purple' },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className={`group bg-gradient-to-br from-${feature.color}-50 to-white rounded-2xl p-8 border border-gray-100 hover:border-${feature.color}-200 transition-all duration-300 hover:shadow-xl`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-14 h-14 bg-${feature.color}-100 rounded-xl flex items-center justify-center group-hover:bg-${feature.color}-600 transition-colors`}>
                      <Icon className={`w-7 h-7 text-${feature.color}-600 group-hover:text-white transition-colors`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Video Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">See It In Action</div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get To Know More About Destination Motivation</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {['Introduction to Destination Motivation', 'How It Fits Into Company Culture', 'Team Building Strategies', 'What Our Clients Say'].map((title, idx) => (
              <div key={idx} className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
                <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                      <Play className="w-6 h-6 text-red-600 ml-1" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm">3:24</div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                    <h3 className="text-white font-bold text-lg">{title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="testimonials" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">Client Success Stories</div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">What Contractors Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { name: 'John Smith', company: 'ABC Contracting', text: 'DM revolutionized our culture. Turnover down 40%!' },
              { name: 'Sarah Johnson', company: 'Premier Remodels', text: 'The dealership training was a game-changer for our managers.' },
              { name: 'Mike Davis', company: 'Elite Construction', text: 'Employee satisfaction scores up 35% in just 6 months!' },
            ].map((testimonial, idx) => (
              <div key={idx} className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 relative">
                <Quote className="absolute top-6 right-6 w-12 h-12 text-red-600 opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (<Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />))}
                </div>
                <p className="text-gray-700 text-lg leading-relaxed mb-6 relative z-10">"{testimonial.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-20 bg-gradient-to-br from-red-600 via-red-700 to-red-900">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Ready to Transform Your Team?</h2>
            <p className="text-xl md:text-2xl text-white/90 mb-4">Join 500+ contractors who have revolutionized their company culture</p>
            <p className="text-lg text-white/80 mb-12">with Destination Motivation</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="group bg-green-500 text-white px-10 py-5 rounded-full hover:bg-green-600 transition-all flex items-center justify-center gap-3 text-lg font-bold shadow-2xl">
                <Calendar className="w-6 h-6" />
                Schedule Introduction
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/20">
              {[
                { value: '500+', label: 'Contractors Helped' },
                { value: '+12%', label: 'Avg Close Rate' },
                { value: '9.2/10', label: 'Customer Score' },
                { value: '95%', label: 'Recommend' },
              ].map((stat, idx) => (
                <div key={idx}>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <svg className="h-8 w-8" viewBox="0 0 40 40" fill="none">
                  <path d="M20 0L24.4721 15.5279L40 20L24.4721 24.4721L20 40L15.5279 24.4721L0 20L15.5279 15.5279L20 0Z" fill="#DC2626"/>
                </svg>
                <span className="text-xl font-bold">Power<span className="text-red-600">100</span></span>
              </div>
              <p className="text-gray-400 mb-4">Transform your sales process with vacation vouchers that create emotional connections.</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#results" className="text-gray-400 hover:text-white transition-colors">Results</a></li>
                <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <p className="text-gray-400 text-sm">info@power100.com</p>
              <p className="text-gray-400 text-sm">(555) 123-4567</p>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">© 2025 Power100 Experience. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
